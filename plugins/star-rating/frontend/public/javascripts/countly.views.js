/*global $, starRatingPlugin, app, jQuery, CountlyHelpers, starView, store, countlyGlobal, countlyCommon, ClipboardJS, tippy, moment, countlyView, Handlebars, production, path1*/
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
    ratingFilter: {"comments": {'platform': "", "version": "", "rating": "", "widget": ""}, "ratings": {'platform': "", "version": "", "widget": ""}},
    localizeStars: ["star.one-star", "star.two-star", "star.three-star", "star.four-star", "star.five-star"],
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
        trigger_position: 'mright',
        trigger_bg_color: '#13B94D',
        trigger_font_color: '#ffffff',
        trigger_button_text: jQuery.i18n.map['feedback.trigger-button-text'],
        target_devices: {
            phone: false,
            desktop: false,
            tablet: false
        },
        //target_devices: [],
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
    deviceNameParser: function(obj) {
        var n = [], key, z;
        for (key in obj) {
            if (obj[key]) {
                n.push(key);
            }
        }
        z = n.shift() || '';
        while (n.length > 1) {
            z += ', ' + n.shift();
        }
        if (n.length === 0) {
            return z;
        }
        return z + ' & ' + n.shift();
    },
    beforeRender: function() {
        var self = this;
        // will load template, platform and version, periodperiod's rating data
        return $.when($.get(countlyGlobal.path + '/star-rating/templates/star.html'), starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackData(), starRatingPlugin.requestFeedbackWidgetsData()).done(function(result) {
            self.template = Handlebars.compile(result[0]);
            self.templateData.platform_version = starRatingPlugin.getPlatformVersion();

            self.templateData.rating = starRatingPlugin.getRatingInPeriod();
            self.templateData.widget = starRatingPlugin.getFeedbackWidgetsData();
        });
    },
    /**
     * This is for render platform dropdown select view.
     * @namespace starView
     * @method loadPlatformData
     */
    loadPlatformData: function() {
        var self = this;
        $(".platform-list").html('<div data-value="All Platforms" class="platform-option item" data-localize="star.all-platforms">' + jQuery.i18n.map['star.all-platforms'] + '</div>');
        for (var platform in this.templateData.platform_version) {
            if (platform !== 'undefined') {
                $(".platform-list").append('<div data-value="' + platform + '" class="platform-option item" data-localize="">' + platform + '</div>');
            }
        }
        $(".platform-option").on("click", function() {
            self.platform = $(this).data('value');
            if (!self.platform || self.platform === "All Platforms") {
                self.platform = "";
            }
            $("#ratings_version_" + self._tab).clySelectSetSelection("", "");
            $("#ratings_version_" + self._tab + " .text").html('<div class="placeholder" data-localize="feedback.select-version">' + jQuery.i18n.map['feedback.select-version'] + '</div>');
            self.loadVersionData();
        });
    },
    /**
     * This is for render platform dropdown select view.
     * @namespace starView
     * @method loadPlatformData
     */
    loadWidgetData: function() {
        $(".widget-list").html('<div data-value="All Widgets" class="widget-option item" data-localize="star.all-widgets">' + jQuery.i18n.map['star.all-widgets'] + '</div>');
        for (var i = 0; i < this.templateData.widget.length; i++) {
            $(".widget-list").append('<div data-value="' + this.templateData.widget[i]._id + '" class="widget-option item" data-localize="">' + this.templateData.widget[i].popup_header_text + '</div>');
        }
    },
    /**
     * This is for render rating dropdown select view.
     * @namespace starView
     * @method loadRatingData
     * @param {boolean} keepOpen - will it keep open?
     */
    resetFilterBox: function(keepOpen) {
        var self = this;
        var values = this.ratingFilter[this._tab];
        if (!keepOpen) {
            $("#rating-selector").removeClass('active');
            $("#rating-selector-graph").removeClass('active');
            $(".star-rating-selector-form").hide();
        }
        if (values.rating === "") {
            $("#ratings_rating_" + this._tab).clySelectSetSelection("", "");
            $("#ratings_rating_" + this._tab + " .text").html('<div class="placeholder" data-localize="feedback.select-rating">' + jQuery.i18n.map['feedback.select-rating'] + '</div>');
        }
        else {
            $("#ratings_rating_" + this._tab).clySelectSetSelection(values.rating, jQuery.i18n.map[this.localizeStars[parseInt(values.rating) - 1]]);
        }

        if (values.platform === "") {
            $("#ratings_platform_" + this._tab).clySelectSetSelection("", "");
            $("#ratings_platform_" + this._tab + " .text").html('<div class="placeholder" data-localize="feedback.select-platform">' + jQuery.i18n.map['feedback.select-platform'] + '</div>');
        }
        else {
            $("#ratings_platform_" + this._tab).clySelectSetSelection(values.platform, values.platform);
        }

        if (values.version === "") {
            $("#ratings_version_" + this._tab).clySelectSetSelection("", "");
            $("#ratings_version_" + this._tab + " .text").html('<div class="placeholder" data-localize="feedback.select-version">' + jQuery.i18n.map['feedback.select-version'] + '</div>');
        }
        else {
            $("#ratings_version_" + this._tab).clySelectSetSelection(values.version, values.version.replace(/:/g, "."));
        }

        if (values.widget === "") {
            $("#ratings_widget_" + this._tab).clySelectSetSelection("", "");
            $("#ratings_widget_" + this._tab + " .text").html('<div class="placeholder" data-localize="feedback.select-widget">' + jQuery.i18n.map['feedback.select-widget'] + '</div>');
        }
        else {
            for (var i = 0; i < this.templateData.widget.length; i++) {
                if (this.templateData.widget[i]._id === values.widget) {
                    $("#ratings_widget_" + self._tab).clySelectSetSelection(values.widget, this.templateData.widget[i].popup_header_text);
                }
            }
        }

    },
    addScriptsForFilter: function() {
        var self = this;
        $("#rating-selector").on("click", function() {
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
                $("#star-rating-comment-filter").hide();
            }
            else {
                $(this).addClass('active');
                $("#star-rating-comment-filter").show();
            }
        });

        $("#rating-selector-graph").on("click", function() {
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
                $("#star-rating-rating-filter").hide();
            }
            else {
                $(this).addClass('active');
                $("#star-rating-rating-filter").show();
            }
        });

        $(".remove-star-rating-filter").on("click", function() {
            if (self._tab === "comments") {
                self.ratingFilter.comments = {'platform': "", "version": "", "rating": "", "widget": ""};
                self.resetFilterBox(true);
                $("#rating-selector a").text(jQuery.i18n.map['star.all-ratings']);
                $.when(starRatingPlugin.requestFeedbackData(self.ratingFilter.comments)).done(function() {
                    self.updateViews();
                });
            }
            else {
                self.ratingFilter.ratings = {'platform': "", "version": "", "widget": ""};
                self.resetFilterBox(true);
                $("#rating-selector-graph a").text(jQuery.i18n.map['star.all-ratings']);
                self.refresh();
            }
        });

        $(".apply-star-rating-filter").on("click", function() {
            $("#rating-selector").removeClass('active');
            $("#rating-selector-graph").removeClass('active');
            $(".star-rating-selector-form").hide();
            var selectText = [];

            self.ratingFilter[self._tab] = {'platform': "", "version": "", "widget": ""};
            var rating = $("#ratings_rating_" + self._tab).clySelectGetSelection();
            var version = $("#ratings_version_" + self._tab).clySelectGetSelection();
            var platform = $("#ratings_platform_" + self._tab).clySelectGetSelection();
            var widget = $("#ratings_widget_" + self._tab).clySelectGetSelection();

            var have_filter = false;
            //rating
            if (self._tab === "comments") {
                if (rating && rating !== "All Ratings" && rating !== "") {
                    selectText.push($("#ratings_rating_" + self._tab).find(".select-inner .text").html());
                    self.ratingFilter[self._tab].rating = rating;
                    have_filter = true;
                }
                else {
                    selectText.push(jQuery.i18n.map['star.all-ratings']);
                    self.ratingFilter[self._tab].rating = "";
                }
            }
            //platform
            if (platform && platform !== "All Platforms" && platform !== "") {
                selectText.push($("#ratings_platform_" + self._tab).find(".select-inner .text").html());
                self.ratingFilter[self._tab].platform = platform;
                have_filter = true;
            }
            else {
                selectText.push(jQuery.i18n.map['star.all-platforms']);
            }

            //version
            if (version && version !== "All Versions" && version !== "") {
                selectText.push(jQuery.i18n.map['version_history.version'] + " " + $("#ratings_version_" + self._tab).find(".select-inner .text").html());
                self.ratingFilter[self._tab].version = version;
                have_filter = true;
            }
            else {
                selectText.push(jQuery.i18n.map['star.all-app-versions']);
            }

            //widget
            if (widget && widget !== "All Widgets" && widget !== "") {
                self.ratingFilter[self._tab].widget = widget;
                selectText.push($("#ratings_widget_" + self._tab).find(".select-inner .text").html());
                have_filter = true;
            }
            else {
                selectText.push(jQuery.i18n.map['star.all-widgets']);
            }

            if (self._tab === "comments") {
                if (have_filter) {
                    $("#rating-selector a").text(selectText.join(", "));
                }
                else {
                    $("#rating-selector a").text(jQuery.i18n.map['star.all-ratings']);
                }

                $.when(starRatingPlugin.requestFeedbackData(self.ratingFilter.comments)).done(function() {
                    self.updateViews();
                });
            }
            else {
                if (have_filter) {
                    $("#rating-selector-graph a").text(selectText.join(", "));
                }
                else {
                    $("#rating-selector-graph a").text(jQuery.i18n.map['star.all-ratings']);
                }
                self.refresh();
            }
        });
    },
    loadRatingData: function() {
        this.templateData.rating_options = [{
            "val": 1,
            "title": jQuery.i18n.map['star.one-star']
        }, {
            "val": 2,
            "title": jQuery.i18n.map['star.two-star']
        }, {
            "val": 3,
            "title": jQuery.i18n.map['star.three-star']
        }, {
            "val": 4,
            "title": jQuery.i18n.map['star.four-star']
        }, {
            "val": 5,
            "title": jQuery.i18n.map['star.five-star']
        }];
        this.templateData.rating_options.reverse().forEach(function(rating) {
            $(".rating-list").append('<div data-value="' + rating.val + '" class="rating-option item" data-localize="">' + rating.title + '</div>');
        });
        $(".rating-list").prepend('<div data-value="All Ratings" class="rating-option item" data-localize="star.all-ratings">' + jQuery.i18n.map['star.all-ratings'] + '</div>');
    },
    /**
     * This is for render version dropdown select view.
     * @namespace starView
     * @method loadVersionData
     */
    loadVersionData: function() {
        var versioinList = [];
        var curPlatform = this.platform;
        if (!curPlatform || curPlatform === '') {
            for (var platform in this.templateData.platform_version) {
                var list = this.templateData.platform_version[platform];
                for (var i = 0; i < list.length; i++) {
                    if (versioinList.indexOf(list[i]) === -1) {
                        versioinList.push(list[i]);
                    }
                }
            }
        }
        else {
            if (this.templateData.platform_version[curPlatform]) {
                versioinList = this.templateData.platform_version[curPlatform];
            }
        }
        //sort versionList
        versioinList.sort(function(a, b) {
            var aparts = a.split(":");
            var bparts = b.split(":");
            for (var p = 0; p < aparts.length; p++) {

                if (bparts[p]) {
                    if (parseInt(aparts[p]) < parseInt(bparts[p])) {
                        return -1;
                    }
                    else if (parseInt(aparts[p]) > parseInt(bparts[p])) {
                        return 1;
                    }
                }
                else {
                    return -1;
                }
            }
            return 0;
        });
        $(".version-list").html('<div data-value="All Versions" class="version-option item" data-localize="star.all-app-versions">' + jQuery.i18n.map['star.all-app-versions'] + '</div>');
        for (var versionIndex = 0; versionIndex < versioinList.length; versionIndex++) {
            if (versioinList[versionIndex] !== 'undefined') {
                var versionShow = versioinList[versionIndex].replace(/:/g, ".");
                $(".version-list").append('<div data-value="' + versioinList[versionIndex] + '" class="version-option item" data-localize="">' + versionShow + '</div>');
            }
        }
    },
    /**
     * This is update chart and table base on starView.currentTab's value.
     * @namespace starView
     * @method updateViews
     * @param {boolean} isRefresh - is it refresh?
     */
    updateViews: function(isRefresh) {
        var self = this;
        self.templateData.platform_version = starRatingPlugin.getPlatformVersion();
        self.templateData.rating = starRatingPlugin.getRatingInPeriod();
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
            countlyCommon.applyColors();
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
        if (this.ratingFilter.ratings.platform === '') {
            regexString += '(\\w+)(\\*\\*)';
        }
        else {
            regexString += this.ratingFilter.ratings.platform.toString().toUpperCase() + '(\\*\\*)';
        }
        if (this.ratingFilter.ratings.version === '') {
            regexString += '(\\w+)(\\S*)(\\w*)(\\*\\*)[1-5]';
        }
        else {
            regexString += this.ratingFilter.ratings.version.toString() + '(\\*\\*)[1-5]';
        }
        if (this.ratingFilter.ratings.widget !== '') {
            regexString += '(\\*\\*)' + this.ratingFilter.ratings.widget.toString();
        }
        return (new RegExp(regexString, 'i')).test(documentName);
    },
    /**
     * This is for return date info like "2016.09.01" in period as array.
     * For chart and table rendering.
     * @namespace starView
     * @method getPeriodArray
     * @return {Array} periodArray.
     */
    getPeriodArray: function() {
        var periodArray = [];
        var periodObject = countlyCommon.getPeriodObj();
        if (parseInt(periodObject.numberOfDays) === 1) {
            periodArray = [periodObject.activePeriod];
        }
        else if (countlyCommon.getPeriod() === 'month') {
            periodArray = starRatingPlugin.getPeriod().currentPeriodArr;
        }
        else if (periodObject.currentPeriodArr === undefined) {
            periodArray = [];
            for (var i = periodObject.periodMin; i <= periodObject.periodMax; i++) {
                periodArray.push(periodObject.activePeriod + '.' + i);
            }
        }
        else {
            periodArray = periodObject.currentPeriodArr;
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
        var result = this.templateData.rating;
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
                        while (times--) {
                            ratingArray.push(parseInt(rank));
                        }
                    }
                }
            }
        }
        var sum = 0,
            middle = 0;
        this.cumulativeData.forEach(function(star) {
            sum += star.count;
        });
        this.cumulativeData.forEach(function(star) {
            var tmpPercent = (sum === 0) ? 0 : ((star.count / sum) * 100).toFixed(1);
            star.percent = "<div class='percent-bar' style='width:" + (2 * tmpPercent) + "px;'></div>" + tmpPercent + "%";
        });
        $("#total-rating").html(sum);
        ratingArray.sort();
        if (sum === 0) {
            middle = 0;
        }
        else if (sum % 2 === 1) {
            middle = ratingArray[Math.round(sum / 2) - 1];
        }
        else {
            middle = (ratingArray[sum / 2 - 1] + ratingArray[sum / 2]) / 2;
        }
        middle = (middle * 1.0).toFixed(2);
        $("#median-rating").html(middle);
    },
    renderCumulativeTable: function() {
        var data = [];
        for (var i = 0; i < 5; i++) {
            data.push({
                rating: this.iconGenerator(i + 1, false),
                count: this.cumulativeData[i].count,
                percentage: this.cumulativeData[i].percent
            });
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
        var self = this;
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
        if (self._tab === 'ratings') {
            countlyCommon.drawGraph(da, "#dashboard-graph", "bar", {
                colors: [countlyCommon.GRAPH_COLORS[0]]
            });
        }
    },
    iconGenerator: function(times) {
        var result = '';
        var starName = '';
        switch (times) {
        case 1:
            starName = jQuery.i18n.map["star.one-star"];
            break;
        case 2:
            starName = jQuery.i18n.map["star.two-star"];
            break;
        case 3:
            starName = jQuery.i18n.map["star.three-star"];
            break;
        case 4:
            starName = jQuery.i18n.map["star.four-star"];
            break;
        case 5:
            starName = jQuery.i18n.map["star.five-star"];
            break;
        }
        // there is no localization for these strings for now
        var rating_strings = ["Very dissatisfied", "Somewhat dissatisfied", "Neither satisfied nor dissatisfied", "Somewhat satisfied", "Very satisfied"];
        var typeName = '<a style="font-size: 1px; display:none;">' + starName + '</a>';
        if (times && times > 0) {
            result += '<span><img class="little-feedback-icon" src="star-rating/images/star-rating/' + (times - 1) + '_color.svg"></span><span class="star-rating-icon-title">' + rating_strings[times - 1] + '</span>';
        }
        result += typeName;
        return result;
    },
    /**
     * This is for TimeSeries view data calc
     * call before "renderTimeSeriesTable" and  "renderTimeSeriesChart"
     * @namespace starView
     * @method calCumulativeData
     * @return {object} - returns time series data
     */
    calTimeSeriesData: function() {
        var result = this.templateData.rating;
        var periodArray = this.getPeriodArray();
        this.templateData.timeSeriesData = [];
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
            };
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
                        rows[LocalDateDisplayName]["star" + rank] += result[year][month][day][rating].c;
                        seriesChart["star" + rank] += result[year][month][day][rating].c;
                    }
                }
            }
            seriesChartList.push(seriesChart);
        }
        this.templateData.seriesChartList = seriesChartList;
        for (var dateDisplayName in rows) {
            this.templateData.timeSeriesData.push(rows[dateDisplayName]);
        }
        return this.templateData.timeSeriesData;
    },
    renderTimeSeriesTable: function(isRefresh) {
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableTwo').dataTable(), this.templateData.timeSeriesData);
        }
        else {
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
                "aaData": this.templateData.timeSeriesData,
                "aoColumns": columnsDefine
            }));
            $('#tableTwo').dataTable().fnSort([
                [0, 'desc']
            ]);
            $('#tableTwo').stickyTableHeaders();
        }
    },
    renderTimeSeriesChart: function() {
        var self = this;
        var timeSeriesData = this.templateData.timeSeriesData;
        var seriesChartList = this.templateData.seriesChartList;
        var graphData = [{
            "data": [],
            "label": jQuery.i18n.map["star.one-star"],
            "color": countlyCommon.GRAPH_COLORS[0]
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.two-star"],
            "color": countlyCommon.GRAPH_COLORS[1]
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.three-star"],
            "color": countlyCommon.GRAPH_COLORS[2]
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.four-star"],
            "color": countlyCommon.GRAPH_COLORS[3]
        }, {
            "data": [],
            "label": jQuery.i18n.map["star.five-star"],
            "color": countlyCommon.GRAPH_COLORS[4]
        }];
        var period = countlyCommon.getPeriod();
        var bucket = null;
        var overrideBucket = false;
        var chartData = seriesChartList;
        if (period === 'yesterday' || period === 'hour' || countlyCommon.getPeriodObj().numberOfDays === 1) {
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
        if (self._tab === 'ratings') {
            return countlyCommon.drawTimeGraph(renderData, "#dashboard-graph", bucket, overrideBucket);
        }
    },
    renderCommentsTable: function(isRefresh) {
        var self = this;
        this.templateData.commentsData = this.getFeedbackData();
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableThree').dataTable(), this.templateData.commentsData);
        }
        else {
            var columnsDefine = [{
                "mData": "rating",
                sType: "numeric",
                "sTitle": jQuery.i18n.map["star.rating"],
                "mRender": function(d, type) {
                    if (type === "display") {
                        var ratings = ["<span class='in-table-smiley-wrapper'><img src='star-rating/images/star-rating/1_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Very dissatisfied</span>", "<span class='in-table-smiley-wrapper'><img src='star-rating/images/star-rating/2_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Somewhat dissatisfied</span>", "<span class='in-table-smiley-wrapper'><img src='star-rating/images/star-rating/3_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Neither satisfied nor dissatisfied</span>", "<span class='in-table-smiley-wrapper'><img src='star-rating/images/star-rating/3_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Somewhat satisfied</span>", "<span class='in-table-smiley-wrapper'><img src='images/star-rating/4_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Very satisfied</span>"];
                        return ratings[d - 1];
                    }
                    return d;
                }
            }, {
                "mData": function(row) {
                    if (row.comment) {
                        return row.comment;
                    }
                    else {
                        return "-";
                    }
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["feedback.comment"]
            }, {
                "mData": function(row) {
                    if (row.email) {
                        return row.email;
                    }
                    else {
                        return "-";
                    }
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["management-users.email"]
            }, {
                "mData": "ts",
                sType: "numeric",
                "sTitle": jQuery.i18n.map["common.time"],
                "mRender": function(d, type) {
                    if (type === "display") {
                        return countlyCommon.formatTimeAgo(d || 0);
                    }
                    return d;
                }
            }];
            $('#tableThree').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "bServerSide": true,
                "bFilter": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "/feedback/data?app_id=" + countlyCommon.ACTIVE_APP_ID,
                "fnServerData": function(sSource, aoData, fnCallback) {
                    if (self.ratingFilter.comments.rating && self.ratingFilter.comments.rating !== "") {
                        sSource += "&rating=" + self.ratingFilter.comments.rating;
                    }
                    if (self.ratingFilter.comments.version && self.ratingFilter.comments.version !== "") {
                        sSource += "&version=" + self.ratingFilter.comments.version;
                    }
                    if (self.ratingFilter.comments.platform && self.ratingFilter.comments.platform !== "") {
                        sSource += "&platform=" + self.ratingFilter.comments.platform;
                    }
                    if (self.ratingFilter.comments.widget && self.ratingFilter.comments.widget !== "") {
                        sSource += "&widget_id=" + self.ratingFilter.comments.widget;
                    }
                    $.ajax({
                        type: "GET",
                        url: sSource,
                        data: aoData,
                        success: function(responseData) {
                            fnCallback(responseData);
                        }
                    });
                },
                "aoColumns": columnsDefine
            }));
        }

    },
    renderFeedbacksTable: function(isRefresh) {
        var self = this;
        this.templateData.widgetsData = this.getFeedbackWidgetsData();
        if (isRefresh) {
            starRatingPlugin.requestFeedbackWidgetsData().then(function(json) {
                CountlyHelpers.refreshTable(self.widgetTable, json);
            });
        }
        else {
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
                    }
                    else {
                        var input = '<div class="on-off-switch">';
                        if (row.is_active === 'true') {
                            input += '<input type="checkbox" id="widget-status-' + row._id + '"" class="on-off-switch-checkbox" checked>';
                        }
                        else {
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
                    case 'mleft':
                        return jQuery.i18n.map['feedback.middle-left'];
                    case 'mright':
                        return jQuery.i18n.map['feedback.middle-right'];
                    case 'bleft':
                        return jQuery.i18n.map['feedback.bottom-left'];
                    case 'bright':
                        return jQuery.i18n.map['feedback.bottom-left'];
                    default:
                        return jQuery.i18n.map['feedback.middle-right'];
                    }
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["common.location"]
            }, {
                "mData": function(row) {
                    // show "All" or "Selected" in column
                    if (row.target_page === "all") {
                        return "*";
                    }
                    else {
                        var target_pages = "";
                        if (typeof row.target_pages === "string") {
                            try {
                                row.target_pages = JSON.parse(row.target_pages);
                            }
                            catch (jsonParseError) {
                                row.target_pages = ["/"];
                            }
                        }
                        row.target_pages.forEach(function(page) {
                            if (row.target_pages.indexOf(page) < 5) {
                                target_pages += "<div class='feedback-widget-target-page-item'>" + page + "</div>";
                            }
                            else if (row.target_pages.indexOf(page) === 5) {
                                target_pages += "<div class='feedback-widget-target-page-item'>And " + (row.target_pages.length - 5) + " more...</div>";
                            }
                        });
                        return target_pages.trim();
                    }
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["feedback.target-pages"]
            }, {
                "mData": function(row) {
                    var td = {};
                    if (typeof row.target_devices === "string") {
                        try {
                            td = JSON.parse(row.target_devices);
                        }
                        catch (jsonParseError) {
                            td = {phone: true, desktop: true, tablet: true};
                        }
                    }
                    else {
                        td = row.target_devices;
                    }

                    return self.deviceNameParser(td);
                    /*
                    if (atLeastOneDevice) return deviceText;
                    else return "No device selected.";
                    */
                },
                sType: "string",
                "sTitle": jQuery.i18n.map["feedback.target-devices"],
                "sWidth": "20%",
                "sClass": "feedback_target_device_field"
            }];
            columnsDefine.push({
                "mData": function(row) {
                    if (!(countlyGlobal.member.admin_of && (countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) && !(countlyGlobal.member.global_admin)) {
                        return '';
                    }
                    else {
                        return "<div class='feedback-options-item options-item'>"
                        + "<div class='edit' data-id='" + row._id + "'></div>"
                        + "<div class='edit-menu rating-feedback-menu' id='" + row._id + "'>"
                        + "<div data-clipboard-text='" + row._id + "' class='copy-widget-id item'" + " data-id='" + row._id + "'" + "><i class='fa fa-clipboard'></i>" + jQuery.i18n.map["common.copy-id"] + "</div>"
                        + "<div class='show-instructions item' data-id='" + row._id + "'" + "><i class='fa fa-eye'></i>" + jQuery.i18n.map["feedback.show-instructions"] + "</div>"
                        + "<div class='edit-widget item'" + " data-id='" + row._id + "'" + "><i class='fa fa-pencil'></i>" + jQuery.i18n.map["feedback.edit"] + "</div>"
                        + "<div class='delete-widget item'" + " data-id='" + row._id + "'" + "><i class='fa fa-trash'></i>" + jQuery.i18n.map["feedback.delete"] + "</div>"
                        + "</div>"
                         + "</div>";
                    }
                },
                "bSortable": false,
            });
            this.widgetTable = $('#tableFour').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData.widgetsData,
                "aoColumns": columnsDefine
            }));
        }
    },
    renderFeedbackDrawer: function() {
        var tabs = [];
        var counter = 0;
        for (var key in $('.feedback-preview-body')) {
            if (counter < 3) {
                tabs.push($('.feedback-preview-body')[key]);
                counter++;
            }
        }

        tabs.forEach(function(el) {
            $(el).css({
                "display": "none"
            });
        });
        if (this.step === 3) {
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
        }
        else if (this.step === 2) {
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
        }
        else if (this.step === 1) {
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
        var stepViews = [];
        counter = 0;
        for (var step in $('.feedback-create-step-view')) {
            if (counter < 3) {
                stepViews.push($('.feedback-create-step-view')[step]);
                counter++;
            }
        }
        stepViews.forEach(function(el) {
            $(el).css({
                "display": "none"
            });
        });
        var headerSlices = [];
        counter = 0;
        for (var slice in $('.feedback-create-side-header-slice')) {
            if (counter < 3) {
                headerSlices.push($('.feedback-create-side-header-slice')[slice]);
                counter++;
            }
        }
        headerSlices.forEach(function(el) {
            $(el).removeClass('feedback-active-step');
        });
        $('#feedback-step' + this.step + '-title').addClass('feedback-active-step');
        $('#feedback-create-step-' + this.step).css({
            "display": "block"
        });
    },
    renderCommon: function(isRefresh) {
        var self = this;
        new ClipboardJS('.copy-widget-id');
        new ClipboardJS('.feedback-copy-code');

        var processColorString = function(string) {
            if (/^([0-9a-f]{3}){1,2}$/i.test(string)) {
                return "#" + string;
            }
            else {
                return string;
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.ratingFilter = {"comments": {'platform': "", "version": "", "rating": "", "widget": ""}, "ratings": {'platform': "", "version": "", "widget": ""}};
            self.renderCommentsTable();
            self.addScriptsForFilter(); //add filter scripts
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
            });
            // load widget row edit menu
            $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function() {
                var id = $(this).data('id');
                $('.edit-menu').splice(0, $('.edit-menu').length).forEach(function(menu) {
                    if (id !== menu.id) {
                        if (menu.style.display === "block") {
                            menu.style.display = "none";
                        }
                    }
                    else {
                        if (menu.style.display === "block") {
                            menu.style.display = "none";
                        }
                        else {
                            menu.style.display = "block";
                        }
                    }
                });
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
                $('.edit-menu').splice(0, $('.edit-menu').length).forEach(function(menu) {
                    if (id !== menu.id) {
                        if (menu.style.display === "block") {
                            menu.style.display = "none";
                        }
                    }
                    else {
                        if (menu.style.display === "block") {
                            menu.style.display = "none";
                        }
                        else {
                            menu.style.display = "block";
                        }
                    }
                });
            });
            // close when pressed esc
            document.onkeydown = function(evt) {
                evt = evt || window.event;
                var isEscape = false;
                if ("key" in evt) {
                    isEscape = (evt.key === "Escape" || evt.key === "Esc");
                }
                else {
                    isEscape = (evt.keyCode === 27);
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
                    self.feedbackWidget.trigger_font_color = $('#feedback-font-color').val();
                    self.feedbackWidget.trigger_bg_color = $('#feedback-button-color').val();
                    $("#feedback_color_preview_1").css({
                        "background-color": processColorString(self.feedbackWidget.trigger_bg_color)
                    });
                    $("#feedback-button-color").val(self.feedbackWidget.trigger_bg_color);

                    $("#feedback_color_preview_2").css({
                        "background-color": processColorString(self.feedbackWidget.trigger_font_color)
                    });
                    $("#feedback-font-color").val(self.feedbackWidget.trigger_font_color);

                    $("#feedback-sticker-on-window").css({
                        "background-color": processColorString(self.feedbackWidget.trigger_bg_color),
                        "color": processColorString(self.feedbackWidget.trigger_font_color)
                    });

                    path1.style.fill = processColorString(self.feedbackWidget.trigger_font_color);
                    var id = $(this).attr("id");
                    $('.sliderbg').css('background-color', color.css);
                    var a = color.a;
                    $(".rangeslider").slider('value', 100 - Math.round(a * 100));
                    var rgba = "rgba(" + Math.round(color.rgb.r * 256) + "," + Math.round(color.rgb.g * 256) + "," + Math.round(color.rgb.b * 256) + "," + color.a + ")";
                    self.updateConfig(id, {
                        hex: color.hex,
                        alpha: "" + a,
                        rgba: rgba
                    });
                },
                // eslint-disable-next-line
                open: function(event, data) {
                    var vv = $($(this).parent()).find('.my_alpha').val();
                    if (vv === undefined || vv === null || vv === '') {
                        vv = "1";
                    }
                    vv = Math.round(parseFloat(vv) * 100);
                    if (vv !== 100) {
                        $('.alphainput').val(vv);
                        $('.alphainput2').val(vv);
                        $('.alphainput').trigger("change");
                    }
                    $('.sliderbg').css('background-color', $(this).val());
                    // eslint-disable-next-line
                    var rslider = $('.rangeslider').slider({
                        orientation: "vertical",
                        value: 100 - vv,
                        min: 0,
                        max: 100,
                        // eslint-disable-next-line
                        slide: function(event, ui) {
                            var alpha = 100 - ui.value;
                            $('.alphainput2').val(alpha);
                            $('.alphainput').val(alpha);
                            $('.alphainput').trigger("change");
                        }
                    });
                    $('.alphainput2').on('change', function(alphainputEvent) {
                        var val = $(alphainputEvent.target).val();
                        $('.alphainput').val(val);
                        $('.alphainput').trigger("change");
                    });
                    $('.alphainput2').on('keyup', function(alphainput2Event) {
                        var val = $(alphainput2Event.target).val();
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
            });
            // permission controls
            if (countlyGlobal.member.global_admin) {
                $('#create-feedback-widget-button').css({
                    "display": "block"
                });
                $('.options-item').css({
                    "display": "block"
                });
            }
            else if (countlyGlobal.member.admin_of && (countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) {
                $('.options-item').css({
                    "display": "block"
                });
                $('#create-feedback-widget-button').css({
                    "display": "block"
                });
            }
            else {
                $('.on-off-switch-checkbox').attr('disabled', 'disabled');
                $('#create-feedback-widget-button').css({
                    "display": "none"
                });
            }
            //add platform && version && rating selector
            self.loadPlatformData();
            self.loadVersionData();
            self.loadRatingData();
            self.loadWidgetData();
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
                var resizedHeight = window.innerHeight;
                $('.feedback-create-side').css({
                    "height": resizedHeight
                });
                $('.feedback-preview-side').css({
                    "height": resizedHeight - 68
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
            $('body').find("tbody").off("click", ".widget-edit-status").on("click", ".widget-edit-status", function() {
                var id = $(this).data('id');
                starRatingPlugin.requestSingleWidget($(this).data('id'), function(widget) {
                    self.feedbackWidget = widget;
                    if ($('#widget-status-' + id).attr('checked') === 'checked') {
                        $('#widget-status-' + id).removeAttr('checked');
                        self.feedbackWidget.is_active = false;
                    }
                    else {
                        $('#widget-status-' + id).attr('checked', 'checked');
                        self.feedbackWidget.is_active = true;
                    }

                    starRatingPlugin.editFeedbackWidget(self.feedbackWidget, function(result, status) {
                        if (status === 200) {
                            $(".cly-drawer").removeClass("open");
                            var feedebackResult = self.feedbackWidget.is_active ? 'enabled' : 'disabled';
                            CountlyHelpers.notify({
                                type: 'green',
                                delay: 3000,
                                title: jQuery.i18n.map['feedback.successfully-updated'],
                                message: jQuery.i18n.map['feedback.widget-' + feedebackResult + '-successfully']
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                type: 'red',
                                title: jQuery.i18n.map['feedback.somethings-went-wrong'],
                                delay: 3000,
                                message: jQuery.i18n.map['feedback.update-fail-message']
                            });
                        }
                    });
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
                    item: function(item) {
                        return '<div>' + item.key + '</div>';
                    },
                    option: function(item) {
                        var label = item.key;
                        return '<div>' + '<span class="label">' + label + '</span>' + '</div>';
                    }
                },
                createFilter: function() {
                    return true;
                },
                create: function(input) {
                    var isExist = false;
                    if (typeof self.feedbackWidget.target_pages === "string") {
                        JSON.parse(self.feedbackWidget.target_pages).forEach(function(p) {
                            if (p === input) {
                                isExist = true;
                            }
                        });
                        if (!isExist) {
                            JSON.parse(self.feedbackWidget.target_pages).push(input);
                        }
                        return {
                            "key": input
                        };
                    }
                    else {
                        self.feedbackWidget.target_pages.forEach(function(p) {
                            if (p === input) {
                                isExist = true;
                            }
                        });
                        if (!isExist) {
                            self.feedbackWidget.target_pages.push(input);
                        }
                        return {
                            "key": input
                        };
                    }
                }
            });

            $('body').off("click", ".delete-widget").on("click", ".delete-widget", function() {
                $('.edit-menu').css({
                    "display": "none"
                });
                var targetId = $(this).data('id');
                CountlyHelpers.confirm(jQuery.i18n.map["feedback.delete-a-widget-description"], "popStyleGreen", function(result) {
                    if (result) {
                        starRatingPlugin.removeFeedbackWidget(targetId, $('#popupCheckbox').attr('checked'), function(response, xhrStatus) {
                            if (xhrStatus === 200) {
                                CountlyHelpers.notify({
                                    type: 'green',
                                    delay: 3000,
                                    message: 'Feedback widget removed successfully.'
                                });
                                self.renderFeedbacksTable(true);
                            }
                            else {
                                CountlyHelpers.notify({
                                    type: 'red',
                                    delay: 3000,
                                    message: 'Feedback widget couldn\'t removed.'
                                });
                            }
                        });
                    }
                    if (!result) {
                        return true;
                    }
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["feedback.yes-delete-widget"]], {title: jQuery.i18n.map["feedback.delete-a-widget"], image: "delete-an-app"});
            });
            $('body').off("click", ".copy-widget-id").on("click", ".copy-widget-id", function() {
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
                    if (count === 1) {
                        return;
                    }
                    $(this).removeClass("selected");
                }
                else {
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
            });
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
                });
            });
            $('body').off("click", ".star-rating-tab-item").on("click", ".star-rating-tab-item", function() {
                var tabs = [];
                var counter = 0;
                for (var key in $('.star-rating-tab-item')) {
                    if (counter < 3) {
                        tabs.push($('.star-rating-tab-item')[key]);
                        counter++;
                    }
                }
                tabs.forEach(function(el) {
                    $(el).removeClass('star-rating-tab-item-active');
                });
                $(this).addClass('star-rating-tab-item-active');
                self._tab = $(this).data('target');
                if (self._tab === "ratings" || self._tab === "comments") {
                    $("#" + $(this).data('target') + " .widget-header").first().append($("#date-selector"));
                    $("#" + self._tab + " .filter-selector-wrapper").first().append($(".star-rating-selector-form"));
                    self.resetFilterBox();
                }
                app.noHistory('#/analytics/star-rating/' + $(this).data('target'));
                $('.feedback-fields').css({"display": "none"});
                $('#feedback-' + $(this).data('target') + '-tab').css({"display": "block"});
                if ($(this).data('target') === 'ratings') {
                    self.updateViews();
                }
            });
            $('.position-box').on('click', function() {
                var boxes = [];
                var counter = 0;
                for (var key in $('.position-box')) {
                    if (counter < 4) {
                        boxes.push($('.position-box')[key]);
                        counter++;
                    }
                }
                boxes.forEach(function(el) {
                    $(el).removeClass('active-position-box');
                });
                $(this).addClass('active-position-box');
                switch ($(this).data('pos')) {
                case 'mleft':
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
                    self.feedbackWidget.trigger_position = 'mleft';
                    break;
                case 'mright':
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
                    self.feedbackWidget.trigger_position = 'mright';
                    break;
                case 'bleft':
                    $('#feedback-sticker-on-window').removeClass('bright');
                    $('#feedback-sticker-on-window').removeClass('mleft');
                    $('#feedback-sticker-on-window').removeClass('mright');
                    $('#feedback-sticker-on-window').addClass('bleft');
                    self.feedbackWidget.trigger_position = 'bleft';
                    $('#feedback-sticker-on-window').css({
                        "border-top-left-radius": "2px",
                        "border-top-right-radius": "2px",
                        "border-bottom-left-radius": "0px",
                        "border-bottom-right-radius": "0px"
                    });
                    break;
                case 'bright':
                    $('#feedback-sticker-on-window').removeClass('bleft');
                    $('#feedback-sticker-on-window').removeClass('mleft');
                    $('#feedback-sticker-on-window').removeClass('mright');
                    $('#feedback-sticker-on-window').addClass('bright');
                    self.feedbackWidget.trigger_position = 'bright';
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
                    self.feedbackWidget.trigger_position = 'mright';
                    $('#feedback-sticker-on-window').css({
                        "border-top-left-radius": "2px",
                        "border-top-right-radius": "0px",
                        "border-bottom-left-radius": "2px",
                        "border-bottom-right-radius": "0px"
                    });
                    break;
                }
            });
            var renderFeedbackWidgetModal = function(isCreate) {
                $("#feedback-popup-header-text").val(isCreate ? "" : self.feedbackWidget.popup_header_text);
                $("#feedback-popup-comment-text").val(isCreate ? "" : self.feedbackWidget.popup_comment_callout);
                $("#feedback-popup-email-text").val(isCreate ? "" : self.feedbackWidget.popup_email_callout);
                $("#feedback-popup-button-text").val(isCreate ? "" : self.feedbackWidget.popup_button_callout);
                $("#feedback-popup-thanks-text").val(isCreate ? "" : self.feedbackWidget.popup_thanks_message);
                $("#feedback-trigger-text").val(isCreate ? "" : self.feedbackWidget.trigger_button_text);

                $("#counter-for-feedback-popup-header-text").html($("#feedback-popup-header-text").val().length + "/45");
                $("#counter-for-feedback-popup-comment-text").html($("#feedback-popup-comment-text").val().length + "/25");
                $("#counter-for-feedback-popup-email-text").html($("#feedback-popup-email-text").val().length + "/35");
                $("#counter-for-feedback-popup-button-text").html($("#feedback-popup-button-text").val().length + "/35");
                $("#counter-for-feedback-popup-thanks-text").html($("#feedback-popup-thanks-text").val().length + "/45");

                $("#question-area").html(self.feedbackWidget.popup_header_text);
                $("#countly-feedback-comment-title").html(self.feedbackWidget.popup_comment_callout);
                $("#countly-feedback-email-title").html(self.feedbackWidget.popup_email_callout);
                $("#feedback-submit-button").html(self.feedbackWidget.popup_button_callout);
                $(".success-emotions-area > #question-area").html(self.feedbackWidget.popup_thanks_message);
                $("#feedback-sticker-on-window").html("<svg id=\"feedback-sticker-svg\" aria-hidden=\"true\" data-prefix=\"far\" data-icon=\"grin\" class=\"svg-inline--fa fa-grin fa-w-16\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 496 512\"><path id=\"path1\" fill=\"white\" d=\"M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm105.6-151.4c-25.9 8.3-64.4 13.1-105.6 13.1s-79.6-4.8-105.6-13.1c-9.9-3.1-19.4 5.4-17.7 15.3 7.9 47.1 71.3 80 123.3 80s115.3-32.9 123.3-80c1.6-9.8-7.7-18.4-17.7-15.3zM168 240c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z\"></path></svg> " + self.feedbackWidget.trigger_button_text);

                $(".device-box:lt(3)").each(function(index, element) {
                    $(element).removeClass("active-position-box");
                    if (self.feedbackWidget.target_devices[$(element).data("target")]) {
                        $(element).addClass("active-position-box");
                    }
                });

                $(".position-box:lt(4)").each(function(index, element) {
                    if ($(element).data("pos") === self.feedbackWidget.trigger_position) {
                        $(element).addClass("active-position-box");
                    }
                    else {
                        $(element).removeClass("active-position-box");
                    }
                });

                $("#feedback-sticker-on-window").removeClass("mleft");
                $("#feedback-sticker-on-window").removeClass("mright");
                $("#feedback-sticker-on-window").removeClass("bleft");
                $("#feedback-sticker-on-window").removeClass("bright");
                $("#feedback-sticker-on-window").addClass(self.feedbackWidget.trigger_position);

                $("#feedback_color_preview_1").css({
                    "background-color": processColorString(self.feedbackWidget.trigger_bg_color)
                });
                $("#feedback-button-color").val(self.feedbackWidget.trigger_bg_color);

                $("#feedback_color_preview_2").css({
                    "background-color": processColorString(self.feedbackWidget.trigger_font_color)
                });
                $("#feedback-font-color").val(self.feedbackWidget.trigger_font_color);

                $("#feedback-sticker-on-window").css({
                    "background-color": processColorString(self.feedbackWidget.trigger_bg_color),
                    "color": processColorString(self.feedbackWidget.trigger_font_color)
                });

                if (self.feedbackWidget.target_page === "all") {
                    $("#all-pages").addClass("selected");
                    $("#selected-pages").removeClass("selected");
                    $(".feedback-page-selectors").hide();
                }
                else {
                    $("#selected-pages").addClass("selected");
                    $("#all-pages").removeClass("selected");
                    $(".feedback-page-selectors").show();
                }
                $("#feedback-page-selector")[0].selectize.clearOptions();
                self.feedbackWidget.target_pages.forEach(function(page) {
                    $("#feedback-page-selector")[0].selectize.addOption({
                        "key": page
                    });
                    $("#feedback-page-selector")[0].selectize.addItem(page);
                });

                if (self.feedbackWidget.is_active) {
                    $("#set-feedback-checkbox").addClass("fa-check-square");
                    $("#set-feedback-checkbox").removeClass("fa-square-o");
                }
                else {
                    $("#set-feedback-checkbox").addClass("fa-square-o");
                    $("#set-feedback-checkbox").removeClass("fa-check-square");
                }

                if (self.feedbackWidget.hide_sticker) {
                    $("#set-feedback-invisible-checkbox").removeClass("fa-square-o");
                    $("#set-feedback-invisible-checkbox").addClass("fa-check-square");
                }
                else {
                    $("#set-feedback-invisible-checkbox").removeClass("fa-check-square");
                    $("#set-feedback-invisible-checkbox").addClass("fa-square-o");
                }
            };

            $("#create-feedback-widget-button").on("click", function() {
                store.set('drawer-type', 'create');
                $('#feedback-drawer-title').html(jQuery.i18n.map['feedback.add-widget']);
                self.feedbackWidget._id = "";
                self.feedbackWidget.popup_header_text = jQuery.i18n.map["feedback.popup-header-text"];
                self.feedbackWidget.popup_comment_callout = jQuery.i18n.map["feedback.popup-comment-callout"];
                self.feedbackWidget.popup_email_callout = jQuery.i18n.map["feedback.popup-email-callout"];
                self.feedbackWidget.popup_button_callout = jQuery.i18n.map["feedback.popup-button-callout"];
                self.feedbackWidget.popup_thanks_message = jQuery.i18n.map["feedback.popup-thanks-message"];
                self.feedbackWidget.trigger_position = 'mright';
                self.feedbackWidget.trigger_bg_color = '13B94D';
                self.feedbackWidget.trigger_font_color = 'FFFFFF';
                self.feedbackWidget.trigger_button_text = jQuery.i18n.map["feedback.trigger-button-text"];
                self.feedbackWidget.target_devices = {
                    phone: true,
                    desktop: true,
                    tablet: true
                };
                self.feedbackWidget.target_pages = ["/"];
                self.feedbackWidget.target_page = 'all';
                self.feedbackWidget.is_active = true;
                self.feedbackWidget.hide_sticker = false;

                $("#feedback-create-step-1").show();
                $(".cly-drawer").removeClass("open editing");
                $("#create-feedback-widget-drawer").addClass("open");
                renderFeedbackWidgetModal(true);
                $(".cly-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                    $("#save-widget").removeClass("disabled");
                    self.step = 1;
                    self.renderFeedbackDrawer();
                });

                $("#save-widget").off("click").on("click", function() {
                    $("#save-widget").addClass("disabled");
                });
                $("#save-widget").addClass('disabled');
            });
            $("body").on("click", ".edit-widget", function() {
                // set drawer type as edit
                $('.edit-menu').hide();
                store.set('drawer-type', 'edit');
                $('#feedback-drawer-title').html(jQuery.i18n.map['feedback.edit-widget']);
                // get current widget data from server
                starRatingPlugin.requestSingleWidget($(this).data('id'), function(widget) {
                    self.feedbackWidget = widget;
                    $('#feedback-sticker-on-window').html();
                    // set is widget show sticker currently?
                });
                $("#feedback-create-step-1").show();
                $(".cly-drawer").removeClass("open editing");
                $("#create-feedback-widget-drawer").addClass("open");
                renderFeedbackWidgetModal(false);
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
                });
                $("#save-widget").addClass('disabled');
            });
            $('.device-box').on('click', function() {
                // toggle value
                self.feedbackWidget.target_devices[$(this).data('target')] = !self.feedbackWidget.target_devices[$(this).data('target')];
                // check toggled value
                if (self.feedbackWidget.target_devices[$(this).data('target')]) {
                    $(this).addClass('active-position-box');
                    $('#' + $(this).data('target') + '-device-checked').css({
                        opacity: 1
                    });
                }
                else {
                    $('#' + $(this).data('target') + '-device-checked').css({
                        opacity: 0
                    });
                    $(this).removeClass('active-position-box');
                }

                // if toggled value is false
                if (!self.feedbackWidget.target_devices[$(this).data('target')]) {
                    var atLeastOneDevice = false;
                    var targets = [];
                    for (var key in self.feedbackWidget.target_devices) {
                        targets.push(self.feedbackWidget.target_devices[key]);
                    }
                    targets.forEach(function(val) {
                        if (val) {
                            atLeastOneDevice = true;
                        }
                    });
                    if (!atLeastOneDevice) {
                        $('#countly-feedback-next-step').css({"display": "none"});
                        CountlyHelpers.notify({
                            type: 'error',
                            delay: 3000,
                            title: 'Please select device',
                            message: 'At least one device should selected.'
                        });
                    }
                }
                else {
                    $('#countly-feedback-next-step').css({"display": "block"});
                }
            });

            $('#countly-feedback-set-feedback-active').on('click', function() {
                if ($('#countly-feedback-set-feedback-active').data('state') === 1) {
                    $('#set-feedback-checkbox').removeClass('fa-check-square');
                    $('#set-feedback-checkbox').addClass('fa-square-o');
                    $('#countly-feedback-set-feedback-active').data('state', 0);
                    self.feedbackWidget.is_active = false;
                }
                else {
                    $('#set-feedback-checkbox').addClass('fa-check-square');
                    $('#set-feedback-checkbox').removeClass('fa-square-o');
                    $('#countly-feedback-set-feedback-active').data('state', 1);
                    self.feedbackWidget.is_active = true;
                }
            });
            $('#countly-feedback-set-sticker-invisible').on('click', function() {
                if ($('#countly-feedback-set-sticker-invisible').data('state') === 1) {
                    $('#set-feedback-invisible-checkbox').removeClass('fa-check-square');
                    $('#set-feedback-invisible-checkbox').addClass('fa-square-o');
                    $('#countly-feedback-set-sticker-invisible').data('state', 0);
                    self.feedbackWidget.hide_sticker = false;
                }
                else {
                    $('#set-feedback-invisible-checkbox').addClass('fa-check-square');
                    $('#set-feedback-invisible-checkbox').removeClass('fa-square-o');
                    $('#countly-feedback-set-sticker-invisible').data('state', 1);
                    self.feedbackWidget.hide_sticker = true;
                }
            });
            $('.feedback-create-side-header-slice').on('click', function() {
                if (store.get('drawer-type') === 'create') {
                    if ((parseInt($(this).data('step')) - parseInt(self.step)) === 1) {
                        self.step = $(this).data('step');
                        self.renderFeedbackDrawer();
                    }
                }
                else {
                    self.step = $(this).data('step');
                    self.renderFeedbackDrawer();
                }
            });
            $('#countly-feedback-back-step').on('click', function() {
                self.step = parseInt(self.step) - 1;
                self.renderFeedbackDrawer();
            });
            $('#countly-feedback-next-step').on('click', function() {
                self.step = parseInt(self.step) + 1;
                if (self.step === 4) {
                    if (store.get('drawer-type') === 'edit') {
                        starRatingPlugin.editFeedbackWidget(self.feedbackWidget, function(result, status) {
                            if (status === 200) {
                                $(".cly-drawer").removeClass("open");
                                CountlyHelpers.notify({
                                    type: 'green',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.successfully-updated'],
                                    message: jQuery.i18n.map['feedback.successfully-updated-message']
                                });
                                self.renderFeedbacksTable(true);
                            }
                            else {
                                CountlyHelpers.notify({
                                    type: 'red',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.somethings-went-wrong'],
                                    message: jQuery.i18n.map['feedback.update-fail-message']
                                });
                            }
                        });
                        self.step = 1;
                        self.renderFeedbackDrawer();
                    }
                    else {
                        $('#overlay').fadeIn();
                        starRatingPlugin.createFeedbackWidget(self.feedbackWidget, function(result, status) {
                            if (status === 201) {
                                $(".cly-drawer").removeClass("open");
                                $('#widgets-array').html(result.result.split(" ")[2]);
                                $('.feedback-copy-code').attr("data-clipboard-text", "Countly.q.push(['enable_feedback',{'widgets':['" + result.result.split(" ")[2] + "']}]);");
                                CountlyHelpers.notify({
                                    type: 'green',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.successfully-created'],
                                    message: jQuery.i18n.map['feedback.successfully-created-message']
                                });
                                $('.feedback-modal').css({
                                    "display": "block"
                                });
                                self.renderFeedbacksTable(true);
                            }
                            else {
                                CountlyHelpers.notify({
                                    type: 'red',
                                    delay: 3000,
                                    title: jQuery.i18n.map['feedback.somethings-went-wrong'],
                                    message: jQuery.i18n.map['feedback.create-fail-message']
                                });
                            }
                        });
                        self.step = 1;
                        self.renderFeedbackDrawer();
                    }
                }
                self.renderFeedbackDrawer();
            });

            var limitFieldLength = function(field, limit) {
                var fieldLength = $(field).val().length;

                if (fieldLength > limit) {
                    $(field).val($(field).val().substr(0, limit));
                    $(field).addClass("feedback-input-validation-error");
                    $("#countly-feedback-next-step").attr("disabled", "disabled");
                }
                else {
                    $(field).removeClass("feedback-input-validation-error");
                    $("#countly-feedback-next-step").removeAttr("disabled");
                }
                $("#counter-for-" + $(field).attr("id")).html(Math.min(fieldLength, limit) + "/" + limit);
            };

            $('#feedback-popup-header-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                limitFieldLength(this, 45);
                if ($(this).val() === '') {
                    self.feedbackWidget.popup_header_text = jQuery.i18n.map['feedback.popup-header-text'];
                    $('#question-area').html(self.feedbackWidget.popup_header_text);
                }
                else {
                    self.feedbackWidget.popup_header_text = $(this).val();
                    $('#question-area').text(self.feedbackWidget.popup_header_text);
                }
            });
            $('#feedback-trigger-text').on('keyup', function() {
                limitFieldLength(this, 20);
                if ($(this).val() === '') {
                    self.feedbackWidget.trigger_button_text = jQuery.i18n.map['feedback.trigger-button-text'];
                    $('#feedback-sticker-on-window').html('<svg id="feedback-sticker-svg" aria-hidden="true" data-prefix="far" data-icon="grin" class="svg-inline--fa fa-grin fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path id="path1" fill="white" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm105.6-151.4c-25.9 8.3-64.4 13.1-105.6 13.1s-79.6-4.8-105.6-13.1c-9.9-3.1-19.4 5.4-17.7 15.3 7.9 47.1 71.3 80 123.3 80s115.3-32.9 123.3-80c1.6-9.8-7.7-18.4-17.7-15.3zM168 240c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"></path></svg> ' + self.feedbackWidget.trigger_button_text);
                }
                else {
                    self.feedbackWidget.trigger_button_text = countlyCommon.encodeHtml($(this).val());
                    $('#feedback-sticker-on-window').html('<svg id="feedback-sticker-svg" aria-hidden="true" data-prefix="far" data-icon="grin" class="svg-inline--fa fa-grin fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path id="path1" fill="white" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm105.6-151.4c-25.9 8.3-64.4 13.1-105.6 13.1s-79.6-4.8-105.6-13.1c-9.9-3.1-19.4 5.4-17.7 15.3 7.9 47.1 71.3 80 123.3 80s115.3-32.9 123.3-80c1.6-9.8-7.7-18.4-17.7-15.3zM168 240c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z"></path></svg> ' + self.feedbackWidget.trigger_button_text);
                }
            });
            $('#feedback-popup-comment-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                limitFieldLength(this, 25);
                if ($(this).val() === '') {
                    self.feedbackWidget.popup_comment_callout = jQuery.i18n.map['feedback.popup-comment-callout'];
                    $('#countly-feedback-comment-title').html(jQuery.i18n.map['feedback.popup-comment-callout']);
                }
                else {
                    self.feedbackWidget.popup_comment_callout = $(this).val();
                    $('#countly-feedback-comment-title').text(self.feedbackWidget.popup_comment_callout);
                }
            });
            $('#feedback-popup-email-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                limitFieldLength(this, 35);
                if ($(this).val() === '') {
                    self.feedbackWidget.popup_email_callout = jQuery.i18n.map['feedback.popup-email-callout'];
                    $('#countly-feedback-email-title').html(jQuery.i18n.map['feedback.popup-email-callout']);
                }
                else {
                    self.feedbackWidget.popup_email_callout = $(this).val();
                    $('#countly-feedback-email-title').text(self.feedbackWidget.popup_email_callout);
                }
            });
            $('#feedback-popup-button-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                limitFieldLength(this, 35);
                if ($(this).val() === '') {
                    $('#feedback-submit-button').html(jQuery.i18n.map['feedback.popup-button-callout']);
                    self.feedbackWidget.popup_button_callout = jQuery.i18n.map['feedback.popup-button-callout'];
                }
                else {
                    self.feedbackWidget.popup_button_callout = $(this).val();
                    $('#feedback-submit-button').text(self.feedbackWidget.popup_button_callout);
                }
            });
            $('.text-input-in-counter').on('focus', function() {
                $('#counter-for-' + $(this).attr('id')).show();
            });
            $('.text-input-in-counter').on('focusout', function() {
                $('#counter-for-' + $(this).attr('id')).hide();
            });
            $('#feedback-popup-thanks-text').on('keyup', function() {
                self.feedbackModalToggle('success');
                if ($(this).val().length > 45) {
                    $(this).val($(this).val().substr(0, 45));
                    $('#counter-for-' + $(this).attr('id')).html('45/45');
                    $(this).addClass('feedback-input-validation-error');
                    $('#countly-feedback-next-step').attr('disabled', 'disabled');
                }
                else {
                    $('#counter-for-' + $(this).attr('id')).html($(this).val().length + '/' + 45);
                    $('#countly-feedback-next-step').removeAttr('disabled');
                    $(this).removeClass('feedback-input-validation-error');
                    if ($(this).val() === '') {
                        $('.success-emotions-area > #question-area').html(jQuery.i18n.map['feedback.popup-thanks-message']);
                        self.feedbackWidget.popup_thanks_message = jQuery.i18n.map['feedback.popup-thanks-message'];
                    }
                    else {
                        self.feedbackWidget.popup_thanks_message = $(this).val();
                        $('.success-emotions-area > #question-area').text(self.feedbackWidget.popup_thanks_message);
                    }
                }
            });
            $('#popup-modal').on('click', function() {
                self.feedbackModalToggle('popup');
            });
            $('#thanks-modal').on('click', function() {
                self.feedbackModalToggle('success');
                $('#thanks-modal').css({
                    "border-left": "1px solid #2eb52b"
                });
            });
            $('#set-feedback-active').on('change', function() {
                self.feedbackWidget.is_active = ($(this).attr('checked')) ? true : false;
            });
        }
        if (self._tab === 'ratings') {
            this.updateViews();
        }
    },
    feedbackModalToggle: function(which) {
        if (this.currentModal !== which) {
            this.currentModal = which;
            if (which === 'popup') {
                $('.feedback-back').css({
                    'transform': 'rotateY(180deg)'
                });
                $('.feedback-front').css({
                    'transform': 'rotateY(0deg)'
                });
                $('#thanks-modal').removeClass('feedback-modal-active-right');
                $('#popup-modal').addClass('feedback-modal-active-left');
            }
            else {
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
        $.when(starRatingPlugin.requestPlatformVersion(true), starRatingPlugin.requestRatingInPeriod(true, self.ratingFilter.rating), starRatingPlugin.requestFeedbackData(self.ratingFilter.comments)).done(function() {
            self.updateViews(true);
            self.loadPlatformData();
            self.loadVersionData();
        });
    },
    updateConfig: function(id, value) {
        this.cache[id] = value;
        $("#configs-apply-changes").removeClass("configs-changes");
        if (JSON.stringify(this.configsData) !== JSON.stringify(this.cache)) {
            $("#configs-apply-changes").addClass("configs-changes");
        }
        if ($("#configs-apply-changes").hasClass("configs-changes")) {
            $("#configs-apply-changes").show();
        }
        else if (!$("#configs-apply-changes").hasClass("settings-changes")) {
            $("#configs-apply-changes").hide();
        }
    },
    renderTabView: function(target) {
        var self = this;
        //window.location.hash = '/' + countlyCommon.ACTIVE_APP_ID + '/analytics/star-rating/' + target;
        var tabItems = [];
        var counter = 0;
        for (var key in $('.star-rating-tab-item')) {
            if (counter < 3) {
                tabItems.push($('.star-rating-tab-item')[key]);
                counter++;
            }
        }
        tabItems.forEach(function(el) {
            $(el).removeClass('star-rating-tab-item-active');
        });
        $('#' + target + '-tab').addClass('star-rating-tab-item-active');
        $('.feedback-fields').css({"display": "none"});
        $('#feedback-' + target + '-tab').css({"display": "block"});

        if (self._tab === "ratings" || self._tab === "comments") {
            $("#" + self._tab + " .widget-header").first().append($("#date-selector"));
            $("#" + self._tab + " .filter-selector-wrapper").first().append($(".star-rating-selector-form"));
            self.resetFilterBox();
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
    if (tab.length === 0) {
        this.starView._tab = 'ratings';
    }
    else {
        this.starView._tab = tab;
    }
    this.renderWhenReady(this.starView);
});
$(document).ready(function() {
    app.addMenu("reach", {code: "star-rating", url: "#/analytics/star-rating", text: "star.menu-title", icon: '<div class="logo ion-android-star-half"></div>', priority: 20});
});