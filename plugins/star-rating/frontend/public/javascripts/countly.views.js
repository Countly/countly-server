/*global $, countlyAuth, countlyReporting, starRatingPlugin, app, jQuery, CountlyHelpers, starView, store, countlyGlobal, countlyCommon, ClipboardJS, tippy, moment, countlyView, T, path1, addDrill, countlySegmentation, countlyVue*/
var FEATURE_NAME = 'star-rating';

var CommentsTable = countlyVue.views.create({
    template: CV.T("/star-rating/templates/comments-table.html"),
    data: function() {
        return {
            rows: [{
                rating: 5,
                time: Date.now(),
                comment: 'Hey this is a comment!',
                email: 'fb@count.ly'
            },
            {
                rating: 4,
                time: Date.now(),
                comment: 'Hey this is a comment!',
                email: 'fb@count.ly'
            },
            {
                rating: 3,
                time: Date.now(),
                comment: 'Hey this is a comment!',
                email: 'fb@count.ly'
            },
            {
                rating: 2,
                time: Date.now(),
                comment: 'Hey this is a comment!',
                email: 'fb@count.ly'
            },
            {
                rating: 1,
                time: Date.now(),
                comment: 'Hey this is a comment!',
                email: 'fb@count.ly'
            }]
        }
    }
});

var RatingsTable = countlyVue.views.create({
    template: CV.T("/star-rating/templates/ratings-table.html"),
    data: function() {
        return {
            rows: [{
                rating: 5,
                numberOfRatings: 120,
                percentage: '%45.5'
            },
            {
                rating: 4,
                numberOfRatings: 120,
                percentage: '%45.5'
            },
            {
                rating: 3,
                numberOfRatings: 120,
                percentage: '%45.5'
            },
            {
                rating: 2,
                numberOfRatings: 120,
                percentage: '%45.5'
            },
            {
                rating: 1,
                numberOfRatings: 120,
                percentage: '%45.5'
            }]
        }
    }
});

var RatingsTab = countlyVue.views.create({
    template: CV.T("/star-rating/templates/ratings-tab.html"),
    data: function() {
        return {
            barOptions: {
                xAxis: {
                    data: [1, 2, 3, 4, 5]
                },
                series: [
                    {
                        data: [58000, 39000, 18000, 3000, 95000]
                    }
                ]
            },
            tabs: [
                {
                    title: CV.i18n('feedback.ratings'),
                    name: 'ratings-table',
                    component: RatingsTable
                },
                {
                    title: CV.i18n('feedback.comments'),
                    name: 'comments-table',
                    component: CommentsTable
                }
            ],
            dynamicTab: 'ratings-table',
            feedbackData: [],
            rating: {},
            widget: {},
            platform_version: {},
            cumulativeData: {},
            ratingFilter: {
                ratings: {
                    platform: '',
                    version: '',
                    widget: ''
                }
            },
            sum: 0,
            middle: 0
        }
    },
    methods: {
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
            var result = this.rating;
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
                            if (this.cumulativeData[rank - 1]) {
                                this.cumulativeData[rank - 1].count += result[year][month][day][rating].c;
                                var times = result[year][month][day][rating].c;
                                while (times--) {
                                    ratingArray.push(parseInt(rank));
                                }
                            }
                        }
                    }
                }
            }
            
            this.cumulativeData.forEach(function(star) {
                this.sum += star.count;
            });
            this.cumulativeData.forEach(function(star) {
                var tmpPercent = (this.sum === 0) ? 0 : ((star.count / this.sum) * 100).toFixed(1);
                star.percent = "<div class='percent-bar' style='width:" + (2 * tmpPercent) + "px;'></div>" + tmpPercent + "%";
            });
            ratingArray.sort();
            if (this.sum === 0) {
                this.middle = 0;
            }
            else if (this.sum % 2 === 1) {
                this.middle = ratingArray[Math.round(this.sum / 2) - 1];
            }
            else {
                this.middle = (ratingArray[this.sum / 2 - 1] + ratingArray[this.sum / 2]) / 2;
            }
            this.middle = parseFloat((this.middle * 1.0).toFixed(2));
        },
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
        }
    },
    beforeCreate: function() {
        var self = this;
        $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackData(), starRatingPlugin.requestFeedbackWidgetsData())
            .then(function() {
                console.log('here it is');
                self.platform_version = starRatingPlugin.getPlatformVersion();
                self.rating = starRatingPlugin.getRatingInPeriod();
                self.widget = starRatingPlugin.getFeedbackWidgetsData();
                self.calCumulativeData();
            })
    }
});

var WidgetsTab = countlyVue.views.create({
    template: CV.T("/star-rating/templates/widgets-tab.html"),
    data: function() {
        return {
            rows: [
                {
                    status: true,
                    name: 'Widget name',
                    location: 'Bottom Left',
                    target_pages: ['/'],
                    target_devices: 'Phone'
                },
                {
                    status: true,
                    name: 'Widget name',
                    location: 'Bottom Left',
                    target_pages: ['/'],
                    target_devices: 'Phone'
                },
                {
                    status: true,
                    name: 'Widget name',
                    location: 'Bottom Left',
                    target_pages: ['/'],
                    target_devices: 'Phone'
                },
                {
                    status: true,
                    name: 'Widget name',
                    location: 'Bottom Left',
                    target_pages: ['/'],
                    target_devices: 'Phone'
                },
                {
                    status: true,
                    name: 'Widget name',
                    location: 'Bottom Left',
                    target_pages: ['/'],
                    target_devices: 'Phone'
                }
            ]
        }
    }
});

// create vue view
var RatingsMain = countlyVue.views.create({
    template: CV.T("/star-rating/templates/main.html"),
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            dynamicTab: (this.$route.params && this.$route.params.tab) || "ratings",
            tabs: [
                {
                    title: CV.i18n('feedback.ratings'),
                    name: 'ratings',
                    component: RatingsTab,
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/analytics/star-rating'
                },
                {
                    title: CV.i18n('feedback.widgets'),
                    name: 'widgets',
                    component: WidgetsTab,
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/analytics/star-rating'
                }
            ]
        };
    }
});

// wrap vue object with backbone wrapper
var RatingsMainView = new countlyVue.views.BackboneWrapper({
    component: RatingsMain
});

app.ratingsMainView = RatingsMainView;

if (countlyAuth.validateRead(FEATURE_NAME)) {
    app.route("/analytics/star-rating", 'star', function() {
        this.renderWhenReady(this.ratingsMainView);
    });

    app.route("/analytics/star-rating/:tab", 'star', function(tab) {
        // TODO: handle tab mechanism
        this.renderWhenReady(this.ratingsMainView);
    });

    app.addPageScript("/manage/reports", function() {
        countlyReporting.addMetric({name: jQuery.i18n.map["reports.star-rating"], value: "star-rating"});
    });
}

app.addPageScript("/drill#", function() {
    var drillClone;
    var self = app.drillView;
    var record_star_rating = countlyGlobal.record_star_rating;

    if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_star_rating !== "undefined") {
        record_star_rating = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_star_rating;
    }

    if (record_star_rating) {
        if (!$("#drill-type-feedback").length) {
            $("#drill-types").append('<div id="drill-type-feedback" class="item two-phase-selector"><div class="inner"><span class="icon star-rating"><i class="material-icons">star_half</i></span><span class="text">' + jQuery.i18n.map["sidebar.feedback"] + '</span></div></div>');

            var dropdown = '<div id="feedback-selector" class="select-configuration">' +
                    '<div class="text-wrapper" data-localize="drill.select-event"></div>' +
                    '<div class="event-select">' +
                      '<div class="menu">' +
                        '<div class="search event-search">' +
                            '<input type="text" readonly onfocus="if (this.hasAttribute(\'readonly\')) {this.removeAttribute(\'readonly\'); this.blur(); this.focus();}">' +
                        '</div>' +
                        '<div class="list"></div>' +
                      '</div>' +
                   '</div>' +
                 '</div>';
            $("#selector-no-event").after(dropdown);
            $("#feedback-selector").hide();
            $("#drill-types > .item").on("click", function() {
                $("#feedback-selector").hide();
            });

            $("#drill-type-feedback").on("click", function() {

                if ($(this).hasClass("active")) {
                    return true;
                }
                $("#drill-types").find(".item").removeClass("active");
                $(this).addClass("active");

                if ($("#event-selector").is(":visible")) {
                    $("#event-selector").hide();
                }

                $("#feedback-selector").show();
                $(".event-select input").focus();
            });

            $("#feedback-selector .event-select").on("click", ".item", function() {
                $(this).parent().find(".item").removeClass("active");
                $(this).addClass("active");

                self.graphType = "line";
                self.graphVal = "times";
                self.filterObj = {};
                self.byVal = "";
                self.drillChartDP = {};
                self.drillChartData = {};
                self.activeSegmentForTable = "";
                countlySegmentation.reset();

                $("#drill-navigation").find(".menu[data-open=table-view]").hide();

                var currEvent = $(this).data("value");
                var currEventTitle = $(this).html();

                $.when(countlySegmentation.initialize(currEvent)).then(function() {
                    $("#drill-filter-view").replaceWith(drillClone.clone(true));
                    self.adjustFilters();
                    if (!self.keepQueryTillExec) {
                        self.draw(true, false);
                    }
                });
                $("#feedback-selector .event-select").data("value", currEvent);
                $("#drill-type-select").find(".select-toggler .text").text($("#drill-type-feedback").find(".text").text() + ", " + currEventTitle);
                $("#drill-type-select").find(".select-toggler").removeClass('active');
                $("#drill-type-select").find(".main-square").hide();
                $("#drill-type-select").find(".arrow").removeClass("ion-chevron-up").addClass("ion-chevron-down");
            });

            $(".event-select input").off("keydown").on("keydown", function(e) {
                var selector = ".event-select .item.in-subset.navigating";
                if (e.keyCode === 40) {
                    var nextItem = $(selector).removeClass("navigating").nextAll('.in-subset:first');
                    if (nextItem.length === 0) {
                        nextItem = $('.event-select .item.in-subset:first');
                    }
                    nextItem.addClass("navigating");
                }
                else if (e.keyCode === 38) {
                    var prevItem = $(selector).removeClass("navigating").prevAll(".in-subset:first");
                    if (prevItem.length === 0) {
                        prevItem = $('.event-select .item.in-subset:last');
                    }
                    prevItem.addClass("navigating");
                }
                else if (e.keyCode === 13) {
                    $(selector).trigger("click");
                }
                if ($(selector).length !== 0) {
                    var offset = $(selector).position().top - $(selector).parent().position().top;
                    $(selector).parent().scrollTop(offset);
                }
            });

            $('.event-search').off("input", "input").on('input', "input", function() {
                var searchText = new RegExp($(this).val().toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')),
                    searchInside = $(this).parent().next().find(".searchable").addClass("in-subset");

                searchInside.filter(function() {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display', 'none').removeClass("in-subset").removeClass("navigating");

                searchInside.filter(function() {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display', 'block');
            });
        }
        var tmpItem = $("<div>");
        tmpItem.addClass("item").addClass("searchable").addClass("in-subset");
        tmpItem.attr("data-value", "[CLY]_star_rating");
        tmpItem.text(jQuery.i18n.map["internal-events.[CLY]_star_rating"]);
        $("#feedback-selector").find(".list").append(tmpItem);
    }

    setTimeout(function() {
        drillClone = $("#drill-filter-view").clone(true);
    }, 0);
});

$(document).ready(function() {
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        if (!$("#feedback-menu").length) {
            app.addMenu("reach", {code: "feedback", text: "sidebar.feedback", icon: '<div class="logo ion-android-star-half"></div>', priority: 20});
        }

        app.addSubMenu("feedback", {
            code: "star-rating",
            url: "#/analytics/star-rating",
            text: "star.menu-title",
            icon: '<div class="logo ion-android-star-half"></div>',
            priority: 30
        });
    }
});

countlyVue.container.registerMixin("/manage/export/export-features", {
    beforeCreate: function() {
        var self = this;
        $.when(starRatingPlugin.requestFeedbackWidgetsData()).then(function() {
            var widgets = starRatingPlugin.getFeedbackWidgetsData();
            var widgetsList = [];
            widgets.forEach(function(widget) {
                widgetsList.push({
                    id: widget._id,
                    name: widget.popup_header_text
                });
            });

            var selectItem = {
                id: "feedback_widgets",
                name: "Feedback Widgets",
                children: widgetsList
            };
            if (widgetsList.length) {
                self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
            }
        });
    }
});