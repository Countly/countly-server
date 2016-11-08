window.starView = countlyView.extend({
    /**
     * this variable contains the infos that render view required.
     * @type {object}
     */
    templateData: {
        "page-title": jQuery.i18n.map["star.menu-title"],
        platform_version: null,
        rating: null,
        timeSeriesData: null
    },
    platform: '',
    version: '',
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
            starRatingPlugin.requesPeriod()
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
        for (var i = 1; i <= 5; i++) {
            da.dp[0].data[i][1] = this.cumulativeData[i - 1].count;
        }
        countlyCommon.drawGraph(da, "#dashboard-graph", "bar", {colors: ["#56a5ec"]});
    },

    iconGenerator: function (times) {
        var result = '';
        if (times && times > 0) {
            while (times--) {
                result += '<i class="fa fa-star star-icon" aria-hidden="true"></i>';
            }
        }
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
        if (periodArray.length > 0 && (moment(periodArray[0], "YYYY.M.D").isoyear() === currentYear)) {
            dateFormat = 'D MMM';
        }

        var rows = {};
        for (var i = 0; i < periodArray.length; i++) {
            var dateArray = periodArray[i].split('.');
            var year = dateArray[0];
            var month = dateArray[1];
            var day = dateArray[2];

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
                    }
                }
            }
        }
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
        var graphData = [
            {"data": [], "label": jQuery.i18n.map["star.one-star"], "color": "#52A3EF"},
            {"data": [], "label": jQuery.i18n.map["star.two-star"], "color": "#FF8700"},
            {"data": [], "label": jQuery.i18n.map["star.three-star"], "color": "#0EC1B9"},
            {"data": [], "label": jQuery.i18n.map["star.four-star"], "color": "#ad41d5"},
            {"data": [], "label": jQuery.i18n.map["star.five-star"], "color": "#d63b3b"}
        ];

        for (var i = 0; i < timeSeriesData.length; i++) {
            graphData[0].data.push([i, timeSeriesData[i].star1]);
            graphData[1].data.push([i, timeSeriesData[i].star2]);
            graphData[2].data.push([i, timeSeriesData[i].star3]);
            graphData[3].data.push([i, timeSeriesData[i].star4]);
            graphData[4].data.push([i, timeSeriesData[i].star5]);
        }

        var renderData = [];
        for (var key in this.lineChartSelect) {
            if (this.lineChartSelect[key]) {
                renderData.push(graphData[parseInt(key.substring(4)) - 1]);
            }
        }
        var period = countlyCommon.getPeriod();
        var bucket = null;
        if(period === 'yesterday' || period === 'hour'){
            bucket = 'daily';
        }
        countlyCommon.drawTimeGraph(renderData, "#dashboard-graph", bucket);

    },
    renderCommon: function (isRefresh) {
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            //add platform && version selector
            self.loadPlatformData();
            self.loadVersionData();

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

            $("#date-submit").click(function () {
                $.when(
                    starRatingPlugin.requestPlatformVersion(),
                    starRatingPlugin.requestRatingInPeriod(),
                    starRatingPlugin.requesPeriod()
                ).done(function (result) {
                    self.updateViews();
                });
            })
        }

        this.updateViews();
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