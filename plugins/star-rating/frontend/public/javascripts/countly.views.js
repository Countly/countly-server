window.starView = countlyView.extend({
    /**
     * this variable contains the infos that render view required.
     * @type {object}
     */
    initialize: function() {
        if (!production) {
            //For color picker, copy to clipboard feature and tooltip
            CountlyHelpers.loadJS("star-rating/javascripts/jquery.colorpicker.js");
            CountlyHelpers.loadJS("star-rating/javascripts/clipboard.min.js");
            CountlyHelpers.loadJS("star-rating/javascripts/tippy.all.min.js");
        }
    },
    templateData: {
        "page-title": jQuery.i18n.map["star.menu-title"],
        platform_version: null,
        rating: null,
        timeSeriesData: null
    },
    feedbackWidgetTableIsRendered: false,
    _tab: 'ratings',
    platform: '',
    version: '',
    rating: '',
    cache: {},
    step: 1,
    widgetTable: null,
    feedbackWidget: {
        _id: "",
        popup_header_text: jQuery.i18n.map['feedback.popup-header-text'],
        popup_comment_callout: jQuery.i18n.map['feedback.popup-comment-callout'],
        popup_email_callout: jQuery.i18n.map['feedback.popup-email-callout'],
        popup_button_callout: jQuery.i18n.map['feedback.popup-button-callout'],
        popup_thanks_message: jQuery.i18n.map['feedback.popup-thanks-message'],
        trigger_position: 'center-right',
        trigger_bg_color: '#13B94D',
        trigger_font_color: '#ffffff',
        trigger_button_text: jQuery.i18n.map['feedback.trigger-button-text'],
        target_devices: [],
        target_pages: ["/"],
        target_page: 'selected',
        is_active: true,
        hide_sticker: false
    },
    currentModal: 'popup',
    cumulativeData: {},
    currentTab: 'cumulative',
    lineChartSelect: {
        star1: true,
        star2: true,
        star3: true,
        star4: true,
        star5: true
    },
    beforeRender: function() {
        var self = this;
        // will load template, platform and version, period's rating data
        return $.when($.get(countlyGlobal["path"] + '/star-rating/templates/star.html'), starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackData(), starRatingPlugin.requestFeedbackWidgetsData()).done(function(result) {
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
    loadPlatformData: function() {
        $("#platform-list").html('<div data-value="All Platforms" class="platform-option item" data-localize="star.all-platforms">' + jQuery.i18n.map['star.all-platforms'] + '</div>');
        for (var platform in this.templateData['platform_version']) {
            $("#platform-list").append('<div data-value="' + platform + '" class="platform-option item" data-localize="">' + platform + '</div>');
        }
        var self = this;
        $(".platform-option").on("click", function() {
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
        this.templateData['rating_options'] = [{
            "val": 1,
            "title": "Very dissatisfied"
        }, {
            "val": 2,
            "title": "Somewhat dissatisfied"
        }, {
            "val": 3,
            "title": "Neither satisfied nor dissatisfied"
        }, {
            "val": 4,
            "title": "Somewhat satisfied"
        }, {
            "val": 5,
            "title": "Very satisfied"
        }]
        var index = 0;
        this.templateData['rating_options'].reverse().forEach(function(rating) {
            $("#rating-list").append('<div data-value="' + rating.val + '" class="platform-option item" data-localize=""><img src="/star-rating/images/star-rating/' + (4 - index) + '_color.svg" class="rating-smiley-icon"><span class="rating-title-in-dropdown">' + rating.title + '</span></div>');
            index++;
        });
        $("#rating-list").prepend('<div data-value="All Ratings" class="platform-option item" data-localize="star.all-ratings">' + jQuery.i18n.map['star.all-ratings'] + '</div>');
        var self = this;
        $(".rating-option").on("click", function() {
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
    loadVersionData: function() {
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
        $(".version-option").on("click", function() {
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
    updateViews: function(isRefresh) {
        var self = this;
        self.templateData['platform_version'] = starRatingPlugin.getPlatformVersion();
        self.templateData['rating'] = starRatingPlugin.getRatingInPeriod();
        self.calCumulativeData();
        self.calTimeSeriesData();
        self.renderCommentsTable(true);
        self.renderFeedbacksTable(true);
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
    matchPlatformVersion: function(documentName) {
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
    getPeriodArray: function() {
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
    getFeedbackData: function() {
        return starRatingPlugin.getFeedbackData();
    },
    getFeedbackWidgetsData: function() {
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
    calCumulativeData: function() {
        this.cumulativeData = [{
            count: 0,
            percent: 0
        }, {
            count: 0,
            percent: 0
        }, {
            count: 0,
            percent: 0
        }, {
            count: 0,
            percent: 0
        }, {
            count: 0,
            percent: 0
        }];
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
                        while (times--) ratingArray.push(parseInt(rank));
                    }
                }
            }
        }
        var sum = 0,
            middle = 0;
        this.cumulativeData.forEach(function(star) {
            sum += star.count
        });
        this.cumulativeData.forEach(function(star) {
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
    renderCumulativeTable: function(isRefresh) {
        var data = [];
        for (var i = 0; i < 5; i++) {
            data.push({
                rating: this.iconGenerator(i + 1, false),
                count: this.cumulativeData[i].count,
                percentage: this.cumulativeData[i].percent
            })
        }
        var columnsDefine = [{
            "mData": "rating",
            sType: "string",
            "sTitle": jQuery.i18n.map["star.rating"]
        }, {
            "mData": "count",
            "sType": "numeric",
            "sTitle": jQuery.i18n.map["star.number-of-ratings"],
            "mRender": function(d) {
                return countlyCommon.formatNumber(d);
            }
        }, {
            "mData": "percentage",
            sType: "percent",
            "sTitle": jQuery.i18n.map["star.percentage"]
        }];
        var tableData = {
            "aaData": data,
            "aoColumns": columnsDefine
        };
        $('#tableOne').dataTable($.extend({}, $.fn.dataTable.defaults, tableData));
    },
    renderCumulativeChart: function() {
        var da = {
            "dp": [{
                "data": [
                    [-1, null],
                    [0, 0],
                    [1, 0],
                    [2, 0],
                    [3, 0],
                    [4, 0],
                    [5, null]
                ]
            }],
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
        for (var i = 1; i <= 5; i++) {
            da.dp[0].data[i][1] = this.cumulativeData[i - 1].count;
        }
        countlyCommon.drawGraph(da, "#dashboard-graph", "bar", {
            colors: ["#56a5ec"]
        });
    },
    iconGenerator: function(times) {
        var result = '';
        var starName = '';
        switch (times) {
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
        // there is no localization for these strings for now
        var rating_strings = ["Very dissatisfied", "Somewhat dissatisfied", "Neither satisfied nor dissatisfied", "Somewhat satisfied", "Very satisfied"];
        var typeName = '<a style="font-size: 1px; display:none;">' + starName + '</a>';
        if (times && times > 0) {
            result += '<span><img class="little-feedback-icon" src="./star-rating/images/star-rating/' + (times - 1) + '_color.svg"></span><span class="star-rating-icon-title">' + rating_strings[times - 1] + '</span>';
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
    calTimeSeriesData: function() {
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
            if (!rows[LocalDateDisplayName]) {
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
        for (var dateDisplayName in rows) {
            this.templateData['timeSeriesData'].push(rows[dateDisplayName]);
        }
        return this.templateData['timeSeriesData'];
    },
    renderTimeSeriesTable: function(isRefresh) {
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableTwo').dataTable(), this.templateData['timeSeriesData']);
        } else {
            var columnsDefine = [{
                "mData": "date",
                "sType": "customDate",
                "sTitle": jQuery.i18n.map["star.date"]
            }, {
                "mData": "star1",
                sType: "numeric",
                "sTitle": this.iconGenerator(1, true),
                "mRender": function(d) {
                    return countlyCommon.formatNumber(d);
                }
            }, {
                "mData": "star2",
                sType: "numeric",
                "sTitle": this.iconGenerator(2, true),
                "mRender": function(d) {
                    return countlyCommon.formatNumber(d);
                }
            }, {
                "mData": "star3",
                sType: "numeric",
                "sTitle": this.iconGenerator(3, true),
                "mRender": function(d) {
                    return countlyCommon.formatNumber(d);
                }
            }, {
                "mData": "star4",
                sType: "numeric",
                "sTitle": this.iconGenerator(4, true),
                "mRender": function(d) {
                    return countlyCommon.formatNumber(d);
                }
            }, {
                "mData": "star5",
                sType: "numeric",
                "sTitle": this.iconGenerator(5, true),
                "mRender": function(d) {
                    return countlyCommon.formatNumber(d);
                }
            }, ];
            $('#tableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData['timeSeriesData'],
                "aoColumns": columnsDefine
            }));
            $('#tableTwo').dataTable().fnSort([
                [0, 'desc']
            ]);
            $('#tableTwo').stickyTableHeaders();
        }
    },
    renderTimeSeriesChart: function() {
        var timeSeriesData = this.templateData['timeSeriesData'];
        var seriesChartList = this.templateData['seriesChartList'];
        var graphData = [{
            "data": [],
            "label": jQuery.i18n.map["star.one-star"],
            "color": "#52A3EF"
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.two-star"],
            "color": "#FF8700"
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.three-star"],
            "color": "#0EC1B9"
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.four-star"],
            "color": "#ad41d5"
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.five-star"],
            "color": "#d63b3b"
        }];
        var period = countlyCommon.getPeriod();
        var bucket = null;
        var overrideBucket = false;
        var chartData = seriesChartList;
        if (period === 'yesterday' || period === 'hour' || countlyCommon.getPeriodObj().numberOfDays == 1) {
            bucket = 'daily';
            overrideBucket = true;
        }
        if (period === 'month') {
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
            var columnsDefine = [{
                "mData": "rating",
                sType: "string",
                "sTitle": jQuery.i18n.map["star.rating"],
                "mRender": function(d) {
                    var ratings = ["<span class='in-table-smiley-wrapper'><img src='/star-rating/images/star-rating/1_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Very dissatisfied</span>", "<span class='in-table-smiley-wrapper'><img src='/star-rating/images/star-rating/2_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Somewhat dissatisfied</span>", "<span class='in-table-smiley-wrapper'><img src='/star-rating/images/star-rating/3_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Neither satisfied nor dissatisfied</span>", "<span class='in-table-smiley-wrapper'><img src='/star-rating/images/star-rating/3_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Somewhat satisfied</span>", "<span class='in-table-smiley-wrapper'><img src='/images/star-rating/4_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Very satisfied</span>"];
                    return ratings[d - 1];
                }
            }, {
                "mData": function(row) {
                    if (row.comment) return row.comment;
                    else return "-";
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["feedback.comment"]
            }, {
                "mData": function(row) {
                    if (row.email) return row.email;
                    else return "-";
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["management-users.email"]
            }, {
                "mData": "ts",
                sType: "date",
                "sTitle": jQuery.i18n.map["common.time"],
                "mRender": function(d) {
                    return moment(d).format('ddd, DD MMM YYYY HH:MM:SS');
                }
            }];
            $('#tableThree').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData['commentsData'],
                "aoColumns": columnsDefine
            }));
        }
    },
    renderFeedbacksTable: function(isRefresh) {
        var self = this;
        this.templateData["widgetsData"] = this.getFeedbackWidgetsData();
        if (isRefresh) {
            starRatingPlugin.requestFeedbackWidgetsData().then(function(json) {
                CountlyHelpers.refreshTable(self.widgetTable, json);
            })
        } else {
            var columnsDefine = [{
                "mData": function(row) {
                    return row.popup_header_text + '<br><span class="feedback-widget-id">(Widget ID: ' + row._id + ')</span>';
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["report-manager.name"]
            }, {
                "mData": function(row) {
                    if (!(countlyGlobal.member.admin_of && (countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) && !(countlyGlobal.member.global_admin)) {
                        return (row.is_active) ? 'Active' : 'Deactive';
                    } else {
                        var input = '<div class="on-off-switch">';
                        if (row.is_active == 'true') {
                            input += '<input type="checkbox" id="widget-status-' + row._id + '"" class="on-off-switch-checkbox" checked>';
                        } else {
                            input += '<input type="checkbox" id="widget-status-' + row._id + '"" class="on-off-switch-checkbox">';
                        }
                        input += '<label class="on-off-switch-label  widget-edit-status" data-id="' + row._id + '" for="plugin-' + row._id + '"></label>';
                        input += '<span class="text">' + jQuery.i18n.map["common.enable"] + '<span>';
                        return input;
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.status"],
                "bSortable": false
            }, {
                "mData": function(row) {
                    switch (row.trigger_position) {
                        case 'center-left':
                            return jQuery.i18n.map['feedback.middle-left'];
                            break;
                        case 'center-right':
                            return jQuery.i18n.map['feedback.middle-right'];;
                            break;
                        case 'bottom-left':
                            return jQuery.i18n.map['feedback.bottom-left'];;
                            break;
                        case 'bottom-right':
                            return jQuery.i18n.map['feedback.bottom-left'];
                            break;
                    }
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["common.location"]
            }, {
                "mData": function(row) {
                    var target_pages = "";
                    eval(row.target_pages).forEach(function(page) {
                        target_pages += "\n" + page;
                    })
                    return target_pages.trim();
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["feedback.target-pages"]
            }, {
                "mData": function(row) {
                    var td = JSON.parse(row.target_devices);
                    if (td.length == 2) {
                        return td[0].substr(0, 1).toUpperCase() + td[0].substr(1, td[0].length - 1) + " and " + td[1];
                    } else if (td.length == 3) {
                        return td[0] + ", " + td[1] + " and " + td[2];
                    } else if (td.length == 1) {
                        return td[0];
                    } else return "No device selected.";
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["feedback.target-devices"],
                "sWidth": "20%",
                "sClass":"feedback_target_device_field"
            }];
            columnsDefine.push({
                "mData": function(row) {
                    if (!(countlyGlobal.member.admin_of && (countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) && !(countlyGlobal.member.global_admin)) {
                        return '';
                    } else {
                        return "<div class='feedback-options-item options-item'>" 
                        + "<div class='edit' data-id='" + row._id + "'></div>" 
                        + "<div class='edit-menu' id='" + row._id + "'>" 
                        + "<div data-clipboard-text='" + row._id + "' class='copy-widget-id item'" + " data-id='" + row._id + "'" + ">" + jQuery.i18n.map["common.copy-id"] + "</div>" 
                        + "<div class='show-instructions item' data-id='" + row._id + "'" + ">" + jQuery.i18n.map["feedback.show-instructions"] + "</div>" 
                        + "<div class='edit-widget item'" + " data-id='" + row._id + "'" + ">" + jQuery.i18n.map["feedback.edit"] + "</div>" 
                        + "<div class='delete-widget item'" + " data-id='" + row._id + "'" + ">" + jQuery.i18n.map["feedback.delete"] + "</div>" 
                        + "</div>"
                         + "</div>";
                    }
                },
                "bSortable": false,
            });
            this.widgetTable = $('#tableFour').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData['widgetsData'],
                "aoColumns": columnsDefine
            }));
        }
    },
    renderFeedbackDrawer: function() {
        Object.values($('.feedback-preview-body')).slice(0, 3).forEach(function(el) {
            $(el).css({
                "display": "none"
            });
        })
        if (this.step == 3) {
            $('#countly-feedback-next-step').text(jQuery.i18n.map['feedback.complete']);
            $('#countly-feedback-back-step').css({
                "display": "block"
            });
            $('#feedback-preview-step-1').css({
                "display": "block"
            });
            $('#feedback-preview-step-2').css({
                "display": "block"
            });
            $('#completed-1').css({
                "display": "inline-block"
            });
            $('#completed-2').css({
                "display": "inline-block"
            });
            $('#not-completed-1').css({
                "display": "none"
            });
            $('#not-completed-2').css({
                "display": "none"
            });
            $('.feedback-preview-footer').css({
                "display": "block"
            });
            $('.feedback-preview-title').text(jQuery.i18n.map['feedback.preview']);
        } else if (this.step == 2) {
            tippy('.show-tooltip', {
                'theme': 'custom',
                zIndex: 11000,
                arrowType: 'sharp',
                arrow: 'down',
                animation: false
            });
            $('#countly-feedback-next-step').text(jQuery.i18n.map['feedback.next-step']);
            $('#countly-feedback-back-step').css({
                "display": "block"
            });
            $('#completed-1').css({
                "display": "inline-block"
            });
            $('#not-completed-1').css({
                "display": "none"
            });
            $('#completed-2').css({
                "display": "none"
            });
            $('#not-completed-2').css({
                "display": "inline-block"
            });
            $('#feedback-preview-step-2').css({
                "display": "block"
            });
            $('.feedback-preview-title').text(jQuery.i18n.map['feedback.trigger-button-preview']);
            $('.feedback-preview-footer').css({
                "display": "none"
            });
        } else if (this.step == 1) {
            $('#countly-feedback-next-step').text(jQuery.i18n.map['feedback.next-step']);
            $('#countly-feedback-back-step').css({
                "display": "none"
            });
            $('#completed-1').css({
                "display": "none"
            });
            $('#not-completed-1').css({
                "display": "inline-block"
            });
            $('#completed-2').css({
                "display": "none"
            });
            $('#not-completed-2').css({
                "display": "inline-block"
            });
            $('#feedback-preview-step-1').css({
                "display": "block"
            });
            $('.feedback-preview-title').text(jQuery.i18n.map['feedback.popup-preview']);
            $('.feedback-preview-footer').css({
                "display": "block"
            });
        }
        Object.values($('.feedback-create-step-view')).slice(0, 3).forEach(function(el) {
            $(el).css({
                "display": "none"
            });
        })
        Object.values($('.feedback-create-side-header-slice')).slice(0, 3).forEach(function(el) {
            $(el).removeClass('feedback-active-step');
        })
        $('#feedback-step' + this.step + '-title').addClass('feedback-active-step');
        $('#feedback-create-step-' + this.step).css({
            "display": "block"
        });
    },
    renderCommon: function(isRefresh) {
        var self = this;
        new ClipboardJS('.copy-widget-id');
        new ClipboardJS('.feedback-copy-code');
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            self.renderCommentsTable();
            if (!self.feedbackWidgetTableIsRendered) {
                self.renderFeedbacksTable();
            }
            self.renderTabView(self._tab);
            $('.feedback-copy-code').click(function() {
                CountlyHelpers.notify({
                    type: 'green',
                    title: 'Success',
                    delay: 3000,
                    message: jQuery.i18n.map['feedback.code-copied']
                });
            })
            // define array.remove() method
            Array.prototype.remove = function() {
                var what, a = arguments, L = a.length, ax;
                while (L && this.length) {
                    what = a[--L];
                    while ((ax = this.indexOf(what)) !== -1) {
                        this.splice(ax, 1);
                    }
                }
                return this;
            };
            // load widget row edit menu
            $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function() {
                var id = $(this).data('id');
                Object.values($('.edit-menu')).splice(0, Object.values($('.edit-menu')).length - 4).forEach(function(menu) {
                    if (id != menu.id) {
                        if (menu.style.display == "block") menu.style.display = "none";
                    } else {
                        if (menu.style.display == "block") menu.style.display = "none";
                        else menu.style.display = "block";
                    }
                })
                event.stopPropagation();
            });
            $('body').off("click", ".options-item .show-instructions").on("click", ".options-item .show-instructions", function() {
                $('#overlay').fadeIn();
                $('#widgets-array').html($(this).data('id'));
                $('.feedback-copy-code').attr("data-clipboard-text", "Countly.q.push(['enable_feedback',{'widgets':['" + $(this).data('id') + "']}]);");
                $('.feedback-modal').css({
                    "display": "block"
                });
                var id = $(this).data('id');
                Object.values($('.edit-menu')).splice(0, Object.values($('.edit-menu')).length - 4).forEach(function(menu) {
                    if (id != menu.id) {
                        if (menu.style.display == "block") menu.style.display = "none";
                    } else {
                        if (menu.style.display == "block") menu.style.display = "none";
                        else menu.style.display = "block";
                    }
                })
            });
            // close when pressed esc
            document.onkeydown = function(evt) {
                evt = evt || window.event;
                var isEscape = false;
                if ("key" in evt) {
                    isEscape = (evt.key == "Escape" || evt.key == "Esc");
                } else {
                    isEscape = (evt.keyCode == 27);
                }
                if (isEscape) {
                    $(".cly-drawer").removeClass("open editing");
                    $("#create-feedback-widget-drawer").addClass("open");
                    $(".cly-drawer").removeClass("open");
                    $("#save-widget").removeClass("disabled");
                    $('.feedback-modal').css({
                        "display": "none"
                    });
                    self.step = 1;
                    self.renderFeedbackDrawer();
                }
            };
            //activate colorpicker
            $('.colorpicker').colorpicker({
                parts: ['hex', 'map', 'bar', 'rgb', 'alpha', 'footer'],
                showOn: 'both',
                alpha: true,
                altAlpha: false,
                hsv: false,
                buttonColorize: true,
                showNoneButton: true,
                colorFormat: 'HEX',
                select: function(event, color) {
                    if ($('#feedback-font-color').val() == '') self.feedbackWidget.trigger_font_color = '#FFFFFF';
                    if ($('#feedback-button-color').val() == '') self.feedbackWidget.trigger_font_color = '#13B94D';
                    self.feedbackWidget.trigger_font_color = $('#feedback-font-color').val();
                    self.feedbackWidget.trigger_bg_color = $('#feedback-button-color').val();
                    if (self.feedbackWidget.trigger_bg_color.length > 6) {
                        $("#feedback_color_preview_1").css({
                            "background-color": self.feedbackWidget.trigger_bg_color
                        });
                        $('#feedback-button-color').val(self.feedbackWidget.trigger_bg_color);
                    } else {
                        $('#feedback-button-color').val('#' + self.feedbackWidget.trigger_bg_color);
                        $("#feedback_color_preview_1").css({
                            "background-color": '#' + self.feedbackWidget.trigger_bg_color
                        });
                    }
                    if (self.feedbackWidget.trigger_font_color.length > 6) {
                        $("#feedback_color_preview_2").css({
                            "background-color": self.feedbackWidget.trigger_font_color
                        });
                        $('#feedback-font-color').val(self.feedbackWidget.trigger_font_color);
                    } else {
                        $("#feedback_color_preview_2").css({
                            "background-color": '#' + self.feedbackWidget.trigger_font_color
                        });
                        $('#feedback-font-color').val('#' + self.feedbackWidget.trigger_font_color);
                    }
                    $('#feedback-sticker-on-window').css({
                        "background-color": "#" + self.feedbackWidget.trigger_bg_color,
                        "color": "#" + self.feedbackWidget.trigger_font_color
                    });
                    var id = $(this).attr("id");
                    $('.sliderbg').css('background-color', color['css']);
                    var a = color['a'];
                    $(".rangeslider").slider('value', 100 - Math.round(a * 100));
                    var rgba = "rgba(" + Math.round(color["rgb"]["r"] * 256) + "," + Math.round(color["rgb"]["g"] * 256) + "," + Math.round(color["rgb"]["b"] * 256) + "," + color['a'] + ")";
                    self.updateConfig(id, {
                        hex: color['hex'],
                        alpha: "" + a,
                        rgba: rgba
                    });
                },
                open: function(event, data) {
                    var vv = $($(this).parent()).find('.my_alpha').val();
                    if (vv == undefined || vv == null || vv == '') vv = "1";
                    vv = Math.round(parseFloat(vv) * 100);
                    if (vv != 100) {
                        $('.alphainput').val(vv);
                        $('.alphainput2').val(vv);
                        $('.alphainput').trigger("change");
                    }
                    $('.sliderbg').css('background-color', $(this).val());
                    var rslider = $('.rangeslider').slider({
                        orientation: "vertical",
                        value: 100 - vv,
                        min: 0,
                        max: 100,
                        slide: function(event, ui) {
                            var alpha = 100 - ui.value;
                            $('.alphainput2').val(alpha);
                            $('.alphainput').val(alpha);
                            $('.alphainput').trigger("change");
                        }
                    });
                    $('.alphainput2').on('change', function(event, ui) {
                        var val = $(event.target).val();
                        $('.alphainput').val(val);
                        $('.alphainput').trigger("change");
                    });
                    $('.alphainput2').on('keyup', function(event, ui) {
                        var val = $(event.target).val();
                        $('.alphainput').val(val);
                        $('.alphainput').trigger("change");
                    });
                }
            });
            $('.feedback-modal-closer').click(function() {
                $('#overlay').fadeOut();
                $('.feedback-modal').css({
                    "display": "none"
                });
            })
            // permission controls
            if (countlyGlobal.member.global_admin) {
                $('#create-feedback-widget-button').css({
                    "display": "block"
                });
                $('.options-item').css({
                    "display": "block"
                });
            } else if (countlyGlobal.member.admin_of && (countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) {
                $('.options-item').css({
                    "display": "block"
                });
                $('#create-feedback-widget-button').css({
                    "display": "block"
                });
            } else {
                $('.on-off-switch-checkbox').attr('disabled', 'disabled');
                $('#create-feedback-widget-button').css({
                    "display": "none"
                });
            }
            //add platform && version && rating selector
            self.loadPlatformData();
            self.loadVersionData();
            self.loadRatingData();
            self.getFeedbackData();
            self.getFeedbackWidgetsData();
            var height = window.innerHeight;
            $('.feedback-create-side').css({
                "height": height
            });
            $('.feedback-preview-side').css({
                "height": height - 68
            });
            // when window size resized
            $(window).resize(function() {
                var height = window.innerHeight;
                $('.feedback-create-side').css({
                    "height": height
                });
                $('.feedback-preview-side').css({
                    "height": height - 68
                });
            });
            $("#graph-select-container").find(".big-numbers").removeClass("active");
            $("#" + self.currentTab).addClass("active");
            // modal changer default border thing...
            // I know this is not best way
            $('#thanks-modal').css({
                "border-left": "1px solid #2eb52b"
            });
            //tab select
            $(".widget-content .inner").click(function() {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
                self.currentTab = $(this).parent(".big-numbers").attr('id');
                self.updateViews();
            });
            $('body').find("tbody").off("click", ".widget-edit-status").on("click", ".widget-edit-status", function(event) {
                var id = $(this).data('id');
                starRatingPlugin.requestSingleWidget($(this).data('id'), function(widget) {
                    self.feedbackWidget = widget;
                    if ($('#widget-status-' + id).attr('checked') == 'checked') {
                        $('#widget-status-' + id).removeAttr('checked');
                        self.feedbackWidget.is_active = false;
                    } else {
                        $('#widget-status-' + id).attr('checked', 'checked');
                        self.feedbackWidget.is_active = true;
                    }
                    starRatingPlugin.editFeedbackWidget(self.feedbackWidget, function(result, status) {
                        if (status == 200) {
                            $(".cly-drawer").removeClass("open");
                            var result = self.feedbackWidget.is_active ? 'enabled' : 'disabled';
                            CountlyHelpers.notify({
                                type: 'green',
                                delay: 3000,
                                title: jQuery.i18n.map['feedback.successfully-updated'],
                                message: jQuery.i18n.map['feedback.widget-' + result + '-successfully']
                            });
                        } else {
                            CountlyHelpers.notify({
                                type: 'red',
                                title: jQuery.i18n.map['feedback.somethings-went-wrong'],
                                delay: 3000,
                                message: jQuery.i18n.map['feedback.update-fail-message']
                            });
                        }
                    })
                });
            })
            $("#date-selector").click(function() {
                $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod()).done(function(result) {
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
                    item: function(item, escape) {
                        return '<div>' + item.key + '</div>';
                    },
                    option: function(item, escape) {
                        var label = item.key;
                        var caption = item.key;
                        return '<div>' + '<span class="label">' + label + '</span>' + '</div>';
                    }
                },
                createFilter: function(input) {
                    return true;
                },
                create: function(input) {
                    var isExist = false;
                    if (typeof self.feedbackWidget.target_pages === "string") {
                        JSON.parse(self.feedbackWidget.target_pages).forEach(function(p) {
                            if (p == input) isExist = true;
                        })
                        if (!isExist) JSON.parse(self.feedbackWidget.target_pages).push(input);
                        return {
                            "key": input
                        }
                    } else {
                        self.feedbackWidget.target_pages.forEach(function(p) {
                            if (p == input) isExist = true;
                        })
                        if (!isExist) self.feedbackWidget.target_pages.push(input);
                        return {
                            "key": input
                        }
                    }
                }
            });
            $("body").on("click", ".delete-widget", function() {
                $('.edit-menu').css({
                    "display": "none"
                });
                var targetId = $(this).data('id');
                CountlyHelpers.confirmWithCheckbox("This widget will removed permamently? Do you want to continue?", "red", true, "Remove related data", function(result) {
                    if (result) {
                        starRatingPlugin.removeFeedbackWidget(targetId, $('#popupCheckbox').attr('checked'), function(response, xhrStatus) {
                            if (xhrStatus == 200) {
                                CountlyHelpers.notify({
                                    type: 'green',
                                    delay: 3000,
                                    message: 'Feedback widget removed successfully.'
                                });
                                self.renderFeedbacksTable(true);
                            } else {
                                CountlyHelpers.notify({
                                    type: 'red',
                                    delay: 3000,
                                    message: 'Feedback widget couldn\'t removed.'
                                });
                            }
                        })
                    }
                })
            });
            $('body').off("click", ".copy-widget-id").on("click", ".copy-widget-id", function(event) {
                $('.edit-menu').css({
                    "display": "none"
                });
                CountlyHelpers.notify({
                    type: 'green',
                    title: 'Success',
                    delay: 3000,
                    message: jQuery.i18n.map['feedback.widget-id-copied']
                });
            });
            $(".check").click(function() {
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
                $('.feedback-page-selectors').css({
                    "display": "none"
                });
                self.feedbackWidget.target_page = 'all';
            })
            $('#selected-pages').on('click', function() {
                $(this).addClass('selected');
                $('#all-pages').removeClass('selected');
                $('.feedback-page-selectors').css({
                    "display": "block"
                });
                self.feedbackWidget.target_page = 'selected';
                self.feedbackWidget.target_pages.forEach(function(target_page) {
                    $('#feedback-page-selector')[0].selectize.addOption({
                        "key": target_page
                    });
                    $('#feedback-page-selector')[0].selectize.addItem(target_page);
                })
            })
            $("#date-submit").click(function() {
                $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod()).done(function(result) {
                    self.updateViews();
                });
            })
            $('.star-rating-tab-item').on('click', function() {
                Object.values($('.star-rating-tab-item')).slice(0, 3).forEach(function(el) {
                    $(el).removeClass('star-rating-tab-item-active');
                })
                $(this).addClass('star-rating-tab-item-active');
                self._tab = $(this).data('target');
                window.location.hash = '/' + countlyCommon.ACTIVE_APP_ID + '/analytics/star-rating/' + $(this).data('target');
            })
            $('.position-box').on('click', function() {
                Object.values($('.position-box')).slice(0, 4).forEach(function(el) {
                    $(el).removeClass('active-position-box');
                });
                $(this).addClass('active-position-box');
                switch ($(this).data('pos')) {
                    case 'center-left':
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').removeClass('mright');
                        $('#feedback-sticker-on-window').addClass('mleft');
                        $('#feedback-sticker-on-window').css({
                            "border-top-left-radius": "0px",
                            "border-top-right-radius": "2px",
                            "border-bottom-left-radius": "0px",
                            "border-bottom-right-radius": "2px"
                        });
                        self.feedbackWidget.trigger_position = 'center-left';
                        break;
                    case 'center-right':
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').addClass('mright');
                        $('#feedback-sticker-on-window').css({
                            "border-top-left-radius": "2px",
                            "border-top-right-radius": "0px",
                            "border-bottom-left-radius": "2px",
                            "border-bottom-right-radius": "0px"
                        });
                        self.feedbackWidget.trigger_position = 'center-right';
                        break;
                    case 'bottom-left':
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('mright');
                        $('#feedback-sticker-on-window').addClass('bleft');
                        self.feedbackWidget.trigger_position = 'bottom-left';
                        $('#feedback-sticker-on-window').css({
                            "border-top-left-radius": "2px",
                            "border-top-right-radius": "2px",
                            "border-bottom-left-radius": "0px",
                            "border-bottom-right-radius": "0px"
                        });
                        break;
                    case 'bottom-right':
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('mright');
                        $('#feedback-sticker-on-window').addClass('bright');
                        self.feedbackWidget.trigger_position = 'bottom-right';
                        $('#feedback-sticker-on-window').css({
                            "border-top-left-radius": "2px",
                            "border-top-right-radius": "2px",
                            "border-bottom-left-radius": "0px",
                            "border-bottom-right-radius": "0px"
                        });
                        break;
                    default:
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').addClass('mright');
                        self.feedbackWidget.trigger_position = 'center-right';
                        $('#feedback-sticker-on-window').css({
                            "border-top-left-radius": "2px",
                            "border-top-right-radius": "0px",
                            "border-bottom-left-radius": "2px",
                            "border-bottom-right-radius": "0px"
                        });
                        break;
                }
            });
            $("#create-feedback-widget-button").on("click", function() {
                store.set('drawer-type', 'create');
                $('#feedback-drawer-title').html(jQuery.i18n.map['feedback.add-widget']);
                self.feedbackWidget._id = "";
                self.feedbackWidget.popup_header_text = jQuery.i18n.map["feedback.popup-header-text"];
                self.feedbackWidget.popup_comment_callout = jQuery.i18n.map["feedback.popup-comment-callout"];
                self.feedbackWidget.popup_email_callout = jQuery.i18n.map["feedback.popup-email-callout"];
                self.feedbackWidget.popup_button_callout = jQuery.i18n.map["feedback.popup-button-callout"];
                self.feedbackWidget.popup_thanks_message = jQuery.i18n.map["feedback.popup-thanks-message"];
                self.feedbackWidget.trigger_position = 'center-right';
                self.feedbackWidget.trigger_bg_color = '#13B94D';
                self.feedbackWidget.trigger_font_color = '#FFFFFF';
                self.feedbackWidget.trigger_button_text = jQuery.i18n.map["feedback.trigger-button-text"];
                self.feedbackWidget.target_devices = ["phone", "desktop", "tablet"];
                self.feedbackWidget.target_pages = ["/"];
                self.feedbackWidget.target_page = 'selected';
                self.feedbackWidget.is_active = false;
                // set as empty
                $('#feedback-popup-header-text').val('');
                $('#feedback-popup-comment-text').val('');
                $('#feedback-popup-email-text').val('');
                $('#feedback-popup-button-text').val('');
                $('#feedback-popup-thanks-text').val('');
                $('#counter-for-feedback-popup-header-text').html((($('#feedback-popup-header-text').val().length < 10) ? '0' + $('#feedback-popup-header-text').val().length : $('#feedback-popup-header-text').val().length) + '/45');
                $('#counter-for-feedback-popup-comment-text').html((($('#feedback-popup-comment-text').val().length < 10) ? '0' + $('#feedback-popup-comment-text').val().length : $('#feedback-popup-comment-text').val().length) + '/25');
                $('#counter-for-feedback-popup-email-text').html((($('#feedback-popup-email-text').val().length < 10) ? '0' + $('#feedback-popup-email-text').val().length : $('#feedback-popup-email-text').val().length) + '/35');
                $('#counter-for-feedback-popup-button-text').html((($('#feedback-popup-button-text').val().length < 10) ? '0' + $('#feedback-popup-button-text').val().length : $('#feedback-popup-button-text').val().length) + '/35');
                $('#counter-for-feedback-popup-thanks-text').html((($('#feedback-popup-thanks-text').val().length < 10) ? '0' + $('#feedback-popup-thanks-text').val().length : $('#feedback-popup-thanks-text').val().length) + '/45');
                $('#question-area').text(self.feedbackWidget.popup_header_text);
                $('#countly-feedback-comment-title').text(self.feedbackWidget.popup_comment_callout);
                $('#countly-feedback-email-title').text(self.feedbackWidget.popup_email_callout);
                $('#feedback-submit-button').text(self.feedbackWidget.popup_button_callout);
                $('.success-emotions-area > #question-area').text(self.feedbackWidget.popup_thanks_message);
                $('#feedback-create-step-1').css({
                    "display": "block"
                });
                $(".cly-drawer").removeClass("open editing");
                $("#create-feedback-widget-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                    $("#save-widget").removeClass("disabled");
                    self.step = 1;
                    self.renderFeedbackDrawer();
                });
                $('#feedback-sticker-on-window').css({
                    "background-color": self.feedbackWidget.trigger_bg_color,
                    "color": self.feedbackWidget.trigger_font_color
                });
                $('#feedback_color_preview_1').css({
                    "background-color": self.feedbackWidget.trigger_bg_color
                });
                $('#feedback_color_preview_2').css({
                    "background-color": self.feedbackWidget.trigger_font_color
                });
                $('#feedback-button-color').val(self.feedbackWidget.trigger_bg_color);
                $('#feedback-font-color').val(self.feedbackWidget.trigger_font_color);
                $("#save-widget").off("click").on("click", function() {
                    if ($(this).hasClass("disabled")) {
                        return;
                    }
                    $("#save-widget").addClass("disabled");
                    var data = {
                        widget_name: $(".cly-drawer").find('#widget-name').val(),
                        steps: []
                    }
                });
                $(".cly-drawer").find('#feedback-name').off('keyup change').on('keyup change', function() {
                    var feedbackName = $(this).val();
                });
                Object.values($('.device-box')).splice(0, 3).forEach(function(el) {
                    $(el).removeClass('active-position-box');
                    if (typeof self.feedbackWidget.target_devices === "object") {
                        self.feedbackWidget.target_devices.forEach(function(target) {
                            if ($(el).data('target') == target) {
                                $(el).addClass('active-position-box');
                                $('#' + $(el).data('target') + '-device-checked').css({
                                    "opacity": 1
                                });
                            }
                        })
                    } else {
                        JSON.parse(self.feedbackWidget.target_devices).forEach(function(target) {
                            if ($(el).data('target') == target) {
                                $(el).addClass('active-position-box');
                                $('#' + $(el).data('target') + '-device-checked').css({
                                    "opacity": 1
                                });
                            }
                        })
                    }
                })
                $("#save-widget").addClass('disabled');
            });
            $("body").on("click", ".edit-widget", function() {
                // set drawer type as edit
                $('.edit-menu').css({
                    "display": "none"
                });
                store.set('drawer-type', 'edit');
                $('#feedback-drawer-title').html(jQuery.i18n.map['feedback.edit-widget']);
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
                    Object.values($('.position-box')).splice(0, 4).forEach(function(el) {
                        if ($(el).data('pos') == self.feedbackWidget.trigger_position) $(el).addClass('active-position-box');
                        else $(el).removeClass('active-position-box');
                    });
                    // apply current color values to preview feedback sticker
                    $('#counter-for-feedback-popup-header-text').html($('#feedback-popup-header-text').val().length + '/45');
                    $('#counter-for-feedback-popup-comment-text').html($('#feedback-popup-comment-text').val().length + '/25');
                    $('#counter-for-feedback-popup-email-text').html($('#feedback-popup-email-text').val().length + '/35');
                    $('#counter-for-feedback-popup-button-text').html($('#feedback-popup-button-text').val().length + '/35');
                    $('#counter-for-feedback-popup-thanks-text').html($('#feedback-popup-thanks-text').val().length + '/45');
                    // for f9f9f9 value cases
                    if (self.feedbackWidget.trigger_bg_color.length == 6) {
                        $("#feedback_color_preview_1").css({
                            "background-color": '#' + self.feedbackWidget.trigger_bg_color
                        });
                        $('#feedback-button-color').val('#' + self.feedbackWidget.trigger_bg_color);
                    }
                    // for #f9f9f9 value cases
                    else {
                        $("#feedback_color_preview_1").css({
                            "background-color": self.feedbackWidget.trigger_bg_color
                        });
                        $('#feedback-button-color').val(self.feedbackWidget.trigger_bg_color);
                    }
                    if (self.feedbackWidget.trigger_font_color.length == 6) {
                        $("#feedback_color_preview_2").css({
                            "background-color": '#' + self.feedbackWidget.trigger_font_color
                        });
                        $('#feedback-font-color').val('#' + self.feedbackWidget.trigger_font_color);
                    } else {
                        $("#feedback_color_preview_2").css({
                            "background-color": self.feedbackWidget.trigger_font_color
                        });
                        $('#feedback-font-color').val(self.feedbackWidget.trigger_font_color);
                    }
                    // remove existing position class/or classes
                    $('#feedback-sticker-on-window').removeClass('mleft');
                    $('#feedback-sticker-on-window').removeClass('mright');
                    $('#feedback-sticker-on-window').removeClass('bleft');
                    $('#feedback-sticker-on-window').removeClass('bright');
                    $('#feedback-sticker-on-window').addClass(self.feedbackWidget.trigger_position);
                    $('#feedback-sticker-on-window').html(self.feedbackWidget.trigger_button_text);
                    if (self.feedbackWidget.trigger_bg_color.length > 6) {
                        $('#feedback-sticker-on-window').css({
                            "background-color": self.feedbackWidget.trigger_bg_color
                        });
                    } else {
                        $('#feedback-sticker-on-window').css({
                            "background-color": '#' + self.feedbackWidget.trigger_bg_color
                        });
                    }
                    if (self.feedbackWidget.trigger_font_color.length > 6) {
                        $('#feedback-sticker-on-window').css({
                            "color": self.feedbackWidget.trigger_font_color
                        });
                    } else {
                        $('#feedback-sticker-on-window').css({
                            "color": '#' + self.feedbackWidget.trigger_font_color
                        });
                    }
                    // set feedback color values to input
                    $('#feedback-callout-text').val(self.feedbackWidget.trigger_button_text);
                    // set active target device/devices
                    Object.values($('.device-box')).splice(0, 3).forEach(function(el) {
                        $(el).removeClass('active-position-box');
                        if (typeof self.feedbackWidget.target_devices === "object") {
                            self.feedbackWidget.target_devices.forEach(function(target) {
                                if ($(el).data('target') == target) {
                                    $(el).addClass('active-position-box');
                                    $('#' + $(el).data('target') + '-device-checked').css({
                                        "opacity": 1
                                    });
                                }
                            })
                        } else {
                            JSON.parse(self.feedbackWidget.target_devices).forEach(function(target) {
                                if ($(el).data('target') == target) {
                                    $(el).addClass('active-position-box');
                                    $('#' + $(el).data('target') + '-device-checked').css({
                                        "opacity": 1
                                    });
                                }
                            })
                        }
                    })
                    // set target page selector
                    if (self.feedbackWidget.target_page == "all") {
                        $('#all-pages').addClass('selected');
                        $('#selected-pages').removeClass('selected');
                        $('.feedback-page-selectors').css({
                            "display": "none"
                        });
                    } else {
                        $('#selected-pages').addClass('selected');
                        $('#all-pages').removeClass('selected');
                        $('.feedback-page-selectors').css({
                            "display": "block"
                        });
                        // add selected pages into selectize input
                        JSON.parse(self.feedbackWidget.target_pages).forEach(function(p) {
                            $('#feedback-page-selector')[0].selectize.addOption({
                                "key": p
                            });
                            $('#feedback-page-selector')[0].selectize.addItem(p);
                        })
                    }
                    // set is widget active currently?
                    if (self.feedbackWidget.is_active) {
                        $('#set-feedback-checkbox').removeClass('fa-square-o');
                        $('#set-feedback-checkbox').addClass('fa-check-square');
                    } else {
                        $('#set-feedback-checkbox').removeClass('fa-check-square');
                        $('#set-feedback-checkbox').addClass('fa-square-o');
                    }
                    // set is widget show sticker currently?
                    if (self.feedbackWidget.hide_sticker) {
                        $('#set-feedback-invisible-checkbox').removeClass('fa-square-o');
                        $('#set-feedback-invisible-checkbox').addClass('fa-check-square');
                    } else {
                        $('#set-feedback-invisible-checkbox').removeClass('fa-check-square');
                        $('#set-feedback-invisible-checkbox').addClass('fa-square-o');
                    }
                })
                $('#feedback-create-step-1').css({
                    "display": "block"
                });
                $(".cly-drawer").removeClass("open editing");
                $("#create-feedback-widget-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                    $("#save-widget").removeClass("disabled");
                    self.step = 1;
                    self.renderFeedbackDrawer();
                });
                $("#save-widget").off("click").on("click", function() {
                    if ($(this).hasClass("disabled")) {
                        return;
                    }
                    $("#save-widget").addClass("disabled");
                    var data = {
                        widget_name: $(".cly-drawer").find('#widget-name').val(),
                        steps: []
                    }
                });
                $(".cly-drawer").find('#feedback-name').off('keyup change').on('keyup change', function() {
                    var feedbackName = $(this).val();
                });
                $("#save-widget").addClass('disabled');
            });
            $('.device-box').on('click', function() {
                if ($(this).hasClass('active-position-box')) {
                    if (typeof self.feedbackWidget.target_devices === "object") self.feedbackWidget.target_devices.remove($(this).data('target'));
                    else {
                        self.feedbackWidget.target_devices = JSON.parse(self.feedbackWidget.target_devices);
                        self.feedbackWidget.target_devices.remove($(this).data('target'));
                        self.feedbackWidget.target_devices = JSON.stringify(self.feedbackWidget.target_devices);
                    }
                    $(this).removeClass('active-position-box');
                    $('#' + $(this).data('target') + '-device-checked').css({
                        opacity: 0
                    });
                    if (self.feedbackWidget.target_devices.length < 1) {
                        $('#countly-feedback-next-step').attr('disabled', 'disabled');
                        CountlyHelpers.notify({
                            type: 'error',
                            delay: 3000,
                            title: 'Please select device',
                            message: 'At least one device should selected.'
                        });
                    } else $('#countly-feedback-next-step').removeAttr('disabled');
                } else {
                    self.feedbackWidget.target_devices = JSON.parse(self.feedbackWidget.target_devices);
                    self.feedbackWidget.target_devices.push($(this).data('target'));
                    self.feedbackWidget.target_devices = JSON.stringify(self.feedbackWidget.target_devices);
                    $(this).addClass('active-position-box');
                    $('#' + $(this).data('target') + '-device-checked').css({
                        "opacity": 1
                    });
                    if (self.feedbackWidget.target_devices.length < 1) {
                        $('#countly-feedback-next-step').attr('disabled', 'disabled');
                        CountlyHelpers.notify({
                            type: 'error',
                            delay: 3000,
                            title: jQuery.i18n.map['feedback.please-select-device'],
                            message: jQuery.i18n.map['feedback.at-leaset-one-device']
                        });
                    } else $('#countly-feedback-next-step').removeAttr('disabled');
                }
            })
            $('#countly-feedback-set-feedback-active').on('click', function() {
                if ($('#countly-feedback-set-feedback-active').data('state') == 1) {
                    $('#set-feedback-checkbox').removeClass('fa-check-square');
                    $('#set-feedback-checkbox').addClass('fa-square-o');
                    $('#countly-feedback-set-feedback-active').data('state', 0);
                    self.feedbackWidget.is_active = false;
                } else {
                    $('#set-feedback-checkbox').addClass('fa-check-square');
                    $('#set-feedback-checkbox').removeClass('fa-square-o');
                    $('#countly-feedback-set-feedback-active').data('state', 1);
                    self.feedbackWidget.is_active = true;
                }
            });
            $('#countly-feedback-set-sticker-invisible').on('click', function() {
                if ($('#countly-feedback-set-sticker-invisible').data('state') == 1) {
                    $('#set-feedback-invisible-checkbox').removeClass('fa-check-square');
                    $('#set-feedback-invisible-checkbox').addClass('fa-square-o');
                    $('#countly-feedback-set-sticker-invisible').data('state', 0);
                    self.feedbackWidget.showSticker = false;
                } else {
                    $('#set-feedback-invisible-checkbox').addClass('fa-check-square');
                    $('#set-feedback-invisible-checkbox').removeClass('fa-square-o');
                    $('#countly-feedback-set-sticker-invisible').data('state', 1);
                    self.feedbackWidget.showSticker = true;
                }
            });
            $('.feedback-create-side-header-slice').on('click', function() {
                if (store.get('drawer-type') == 'create') {
                    if ((parseInt($(this).data('step')) - parseInt(self.step)) == 1) {
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
                        if ($('#feedback-page-selector').val().length > 0) self.feedbackWidget.target_pages = JSON.stringify($('#feedback-page-selector').val().split(","));
                        starRatingPlugin.editFeedbackWidget(self.feedbackWidget, function(result, status) {
                            if (status == 200) {
                                $(".cly-drawer").removeClass("open");
                                CountlyHelpers.notify({
                                    type: 'green',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.successfully-updated'],
                                    message: jQuery.i18n.map['feedback.successfully-updated-message']
                                });
                                if ($('#feedback-page-selector').val().length > 0) self.feedbackWidget.target_pages = JSON.parse(self.feedbackWidget.target_pages);
                                self.renderFeedbacksTable(true);
                            } else {
                                CountlyHelpers.notify({
                                    type: 'red',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.somethings-went-wrong'],
                                    message: jQuery.i18n.map['feedback.update-fail-message']
                                });
                                if ($('#feedback-page-selector').val().length > 0) self.feedback.target_pages = JSON.parse(self.feedback.target_pages);
                            }
                        })
                        self.step = 1;
                        self.renderFeedbackDrawer();
                    } else {
                        $('#overlay').fadeIn();
                        $('.feedback-modal').css({
                            "display": "block"
                        });
                        if ($('#feedback-page-selector').val().length > 0) self.feedbackWidget.target_pages = JSON.stringify($('#feedback-page-selector').val().split(","));
                        starRatingPlugin.createFeedbackWidget(self.feedbackWidget, function(result, status) {
                            if (status == 201) {
                                $(".cly-drawer").removeClass("open");
                                $('#widgets-array').html(result.result.split(" ")[3]);
                                $('.feedback-copy-code').attr("data-clipboard-text", "Countly.q.push(['enable_feedback',{'widgets':['" + result.result.split(" ")[3] + "']}]);");
                                CountlyHelpers.notify({
                                    type: 'green',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.successfully-created'],
                                    message: jQuery.i18n.map['feedback.successfully-created-message']
                                });
                                if ($('#feedback-page-selector').val().length > 0) self.feedbackWidget.target_pages = JSON.parse(self.feedbackWidget.target_pages);
                                self.renderFeedbacksTable(true);
                            } else {
                                CountlyHelpers.notify({
                                    type: 'red',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.somethings-went-wrong'],
                                    message: jQuery.i18n.map['feedback.create-fail-message']
                                });
                                if ($('#feedback-page-selector').val().length > 0) self.feedbackWidget.target_pages = JSON.parse(self.feedbackWidget.target_pages);
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
                if ($(this).val().length > 46) {
                    $(this).val($(this).val().substr(0, 45));
                    $('#counter-for-' + $(this).attr('id')).html('45/45');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                } else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 45);
                    $(this).removeClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    if ($(this).val() == '') {
                        self.feedbackWidget.popup_header_text = jQuery.i18n.map['feedback.popup-header-text'];
                        $('#question-area').text(self.feedbackWidget.popup_header_text);
                    } else {
                        self.feedbackWidget.popup_header_text = $(this).val();
                        $('#question-area').text($(this).val());
                    }
                }
            })
            $('#feedback-trigger-text').on('keyup', function() {
                if ($(this).val().length > 20) {
                    $(this).val($(this).val().substr(0, 20));
                    $('#counter-for-' + $(this).attr('id')).html('20/20');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                } else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 20);
                    $(this).removeClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    if ($(this).val() == '') {
                        self.feedbackWidget.trigger_button_text = jQuery.i18n.map['feedback.trigger_button_text'];
                        $('#feedback-sticker-on-window').text(self.feedbackWidget.trigger_button_text);
                    } else {
                        self.feedbackWidget.trigger_button_text = $(this).val();
                        $('#feedback-sticker-on-window').text($(this).val());
                    }
                }
            })
            $('#feedback-popup-comment-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                if ($(this).val().length > 25) {
                    $(this).val($(this).val().substr(0, 25));
                    $('#counter-for-' + $(this).attr('id')).html('25/25');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                } else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 25);
                    $('#feedback-create-step-1 > div:nth-child(2) > label').text(jQuery.i18n.map['feedback.popup-comment-callout']);
                    $(this).removeClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    if ($(this).val() == '') {
                        $('#countly-feedback-comment-title').text(jQuery.i18n.map['feedback.popup-comment-callout']);
                        self.feedbackWidget.popup_comment_callout = jQuery.i18n.map['feedback.popup-comment-callout'];
                    } else {
                        $('#countly-feedback-comment-title').text($(this).val());
                        self.feedbackWidget.popup_comment_callout = $(this).val();
                    }
                }
            })
            $('#feedback-popup-email-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                $('#counter-for-' + $(this).attr('id')).css({
                    "display": "block"
                });
                if ($(this).val().length > 35) {
                    $(this).val($(this).val().substr(0, 35));
                    $('#counter-for-' + $(this).attr('id')).html('35/35');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                } else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 35);
                    $(this).removeClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    if ($(this).val() == '') {
                        $('#countly-feedback-email-title').text(jQuery.i18n.map['feedback.popup-email-callout']);
                        self.feedbackWidget.popup_email_callout = jQuery.i18n.map['feedback.popup-email-callout'];
                    } else {
                        $('#countly-feedback-email-title').text($(this).val());
                        self.feedbackWidget.popup_email_callout = $(this).val();
                    }
                }
            })
            $('#feedback-popup-button-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                if ($(this).val().length > 35) {
                    $(this).val($(this).val().substr(0, 35));
                    $('#counter-for-' + $(this).attr('id')).html('35/35');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                } else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 35);
                    $(this).removeClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    if ($(this).val() == '') {
                        $('#feedback-submit-button').text(jQuery.i18n.map['feedback.popup-button-callout']);
                        self.feedbackWidget.popup_button_callout = jQuery.i18n.map['feedback.popup-button-callout'];
                    } else {
                        self.feedbackWidget.popup_button_callout = $(this).val();
                        $('#feedback-submit-button').text($(this).val());
                    }
                }
            })
            $('.text-input-in-counter').on('focus', function() {
                $('#counter-for-' + $(this).attr('id')).css({
                    "display": "block"
                });
            })
            $('.text-input-in-counter').on('focusout', function() {
                $('#counter-for-' + $(this).attr('id')).css({
                    "display": "none"
                });
            })
            $('#feedback-popup-thanks-text').on('keyup', function() {
                self.feedbackModalToggle('success');
                if ($(this).val().length > 45) {
                    $(this).val($(this).val().substr(0, 45));
                    $('#counter-for-' + $(this).attr('id')).html('45/45');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                } else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 45);
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    $(this).removeClass('feedback-input-validation-error');
                    if ($(this).val() == '') {
                        $('.success-emotions-area > #question-area').text(jQuery.i18n.map['feedback.popup-thanks-message']);
                        self.feedbackWidget.popup_thanks_message = jQuery.i18n.map['feedback.popup-thanks-message'];
                    } else {
                        $('.success-emotions-area > #question-area').text($(this).val());
                        self.feedbackWidget.popup_thanks_message = $(this).val();
                    }
                }
            })
            $('#popup-modal').on('click', function() {
                self.feedbackModalToggle('popup');
            })
            $('#thanks-modal').on('click', function() {
                self.feedbackModalToggle('success');
                $('#thanks-modal').css({
                    "border-left": "1px solid #2eb52b"
                });
            })
            $('#set-feedback-active').on('change', function() {
                self.feedbackWidget.is_active = ($(this).attr('checked')) ? true : false;
            });
        }
        if (self._tab == 'ratings') this.updateViews();
    },
    feedbackModalToggle: function(which) {
        if (this.currentModal !== which) {
            this.currentModal = which;
            if (which == 'popup') {
                $('.feedback-back').css({
                    'transform': 'rotateY(180deg)'
                });
                $('.feedback-front').css({
                    'transform': 'rotateY(0deg)'
                });
                $('#thanks-modal').removeClass('feedback-modal-active-right');
                $('#popup-modal').addClass('feedback-modal-active-left');
            } else {
                $('.feedback-front').css({
                    'transform': 'rotateY(180deg)'
                });
                $('.feedback-back').css({
                    'transform': 'rotateY(0deg)'
                });
                $('#thanks-modal').addClass('feedback-modal-active-right');
                $('#popup-modal').removeClass('feedback-modal-active-left');
            }
        }
    },
    refresh: function() {
        var self = this;
        $.when(starRatingPlugin.requestPlatformVersion(true), starRatingPlugin.requestRatingInPeriod(true)).done(function(result) {
            self.updateViews(true);
            self.loadPlatformData();
            self.loadVersionData();
        });
    },
    updateConfig: function(id, value) {
        this.cache[id] = value;
        $("#configs-apply-changes").removeClass("configs-changes");
        if (JSON.stringify(this.configsData) != JSON.stringify(this.cache)) {
            $("#configs-apply-changes").addClass("configs-changes");
        }
        if ($("#configs-apply-changes").hasClass("configs-changes")) $("#configs-apply-changes").show();
        else if (!$("#configs-apply-changes").hasClass("settings-changes")) $("#configs-apply-changes").hide();
    },
    renderTabView: function(target) {
        var self = this;
        window.location.hash = '/' + countlyCommon.ACTIVE_APP_ID + '/analytics/star-rating/' + target;
        Object.values($('.star-rating-tab-item')).slice(0, 3).forEach(function(el) {
            $(el).removeClass('star-rating-tab-item-active');
        })
        $('#' + target + '-tab').addClass('star-rating-tab-item-active');
        if (target == 'ratings') {
            $('#ratings').css({
                "display": "block"
            });
        } else if (target == 'comments') {
            $('#comments').css({
                "display": "block"
            });
        } else if (target == 'widgets') {
            $('#widgets').css({
                "display": "block"
            });
        }
    }
});
//register views
app.starView = new starView();
app.route("/analytics/star-rating", 'star', function() {
    this.starView._tab = 'ratings';
    this.renderWhenReady(this.starView);
});
app.route("/analytics/star-rating/:tab", 'star', function(tab) {
    if (tab.length == 0) {
        this.starView._tab = 'ratings';
    } else {
        this.starView._tab = tab;
    }
    this.renderWhenReady(this.starView);
});
$(document).ready(function() {
    var menu = '<a href="#/analytics/star-rating" class="item">' + '<div class="logo-icon fa fa-globe"></div>' + '<div class="text" data-localize="star.menu-title"></div>' + '</a>';
    $('#web-type #engagement-submenu').append(menu);
    $('#mobile-type #engagement-submenu').append(menu);
});