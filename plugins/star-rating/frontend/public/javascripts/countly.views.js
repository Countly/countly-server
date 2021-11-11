/*global $, countlyAuth, countlyReporting, countlyGlobal, starRatingPlugin, app, jQuery, countlyCommon, CV, countlyVue*/
var FEATURE_NAME = 'star_rating';

var Drawer = countlyVue.views.create({
    template: CV.T("/star-rating/templates/drawer.html"),
    props: {
        settings: Object,
        controls: Object
    },
    mixins: [],
    data: function() {
        return {
            ratingItem: [ { active: false, inactive: false }, { active: false, inactive: false }, { active: false, inactive: false }, { active: false, inactive: false }, { active: false, inactive: false }],
            constants: {
                // TODO: will be localized
                trigger_sizes: [{label: 'Small', value: 's'}, {label: 'Medium', value: 'm'}, {label: 'Large', value: 'l'}],
                trigger_positions: [{value: 'mleft', label: 'Center left', key: 'middle-left'}, { value: 'mright', label: 'Center right', key: 'middle-right' }, { value: 'bleft', label: 'Bottom left', key: 'bottom-left'}, { value: 'bright', label: 'Bottom right', key: 'bottom-right' }]
            },
            logoDropzoneOptions: {
                createImageThumbnails: false,
                maxFilesize: 2, // MB
                autoProcessQueue: false,
                addRemoveLinks: true,
                acceptedFiles: 'image/jpeg,image/png,image/gif',
                dictDefaultMessage: this.i18n('feedback.drop-message'),
                dictRemoveFile: this.i18n('feedback.remove-file'),
                url: "/i/feedback/logo",
                paramName: "logo",
                params: { _csrf: countlyGlobal.csrf_token, identifier: '' }
            },
            logoFile: "",
            stamp: 0,
            cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1
        };
    },
    methods: {
        // drawer event handlers
        onClose: function() {},
        setRatingItemActive: function(index) {
            var self = this;
            this.ratingItem.forEach(function(item) {
                if (self.ratingItem.indexOf(item) !== index) {
                    item.inactive = true;
                    item.active = false;
                }
                else {
                    item.inactive = false;
                    item.active = true;
                }
            });
        },
        onSubmit: function(submitted, done) {
            var self = this;

            if (this.logoFile !== "") {
                submitted.logo = this.logoFile;
            }

            if (this.cohortsEnabled) {
                var finalizedTargeting = null;
                var exported = this.$refs.ratingsSegmentation.export();
                if (!((exported.behaviorSegmentation.length === 0) && (Object.keys(exported.propertySegmentation.query).length === 0))) {
                    finalizedTargeting = Object.assign({}, {
                        user_segmentation: JSON.stringify(exported.propertySegmentation),
                        steps: JSON.stringify(exported.behaviorSegmentation)
                    });
                }

                submitted.targeting = finalizedTargeting;
            }

            if (this.settings.isEditMode) {
                starRatingPlugin.editFeedbackWidget(submitted, function() {
                    self.$emit('widgets-refresh');
                    done();
                });
            }
            else {
                starRatingPlugin.createFeedbackWidget(submitted, function() {
                    self.$emit('widgets-refresh');
                    done();
                });
            }
        },
        onOpen: function() {},
        onFileAdded: function() {
            var self = this;
            this.stamp = Date.now();
            this.logoDropzoneOptions.params.identifier = this.stamp;
            setTimeout(function() {
                self.$refs.logoDropzone.processQueue();
            }, 1);
        },
        onComplete: function(res) {
            this.logoFile = this.stamp + "." + res.upload.filename.split(".")[1];
        }
    }
});

// these table components should be 3 different components
var CommentsTable = countlyVue.views.create({
    template: CV.T("/star-rating/templates/comments-table.html"),
    props: {
        comments: Array
    }
});

var RatingsTable = countlyVue.views.create({
    template: CV.T("/star-rating/templates/ratings-table.html"),
    props: {
        ratings: Array
    }
});

var WidgetsTable = countlyVue.views.create({
    template: CV.T("/star-rating/templates/widgets-table.html"),
    props: {
        rows: {
            type: Array,
            default: []
        }
    },
    data: function() {
        return {
            cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1
        };
    },
    computed: {
        widgets: function() {
            for (var i = 0; i < this.rows.length; i++) {
                var ratingScore = 0;
                if (this.rows[i].ratingsCount > 0) {
                    ratingScore = (this.rows[i].ratingsSum / this.rows[i].ratingsCount).toFixed(1);
                }
                this.rows[i].ratingScore = ratingScore;
                if (this.cohortsEnabled) {
                    this.rows[i] = this.parseTargeting(this.rows[i]);
                }
            }
            return this.rows;
        }
    },
    methods: {
        handleCommand: function(command, id) {
            switch (command) {
            case 'show-detail':
                window.location.hash = "#/" + countlyCommon.ACTIVE_APP_ID + "/feedback/ratings/widgets/" + id;
                break;
            }
        },
        parseTargeting: function(widget) {
            widget.targeting.steps = JSON.parse(widget.targeting.steps);
            widget.targeting.user_segmentation = JSON.parse(widget.targeting.user_segmentation);
            return widget;
        }
    }
});

var RatingsTab = countlyVue.views.create({
    template: CV.T("/star-rating/templates/ratings-tab.html"),
    data: function() {
        return {
            activeFilter: {
                platform: "",
                version: "",
                widget: ""
            },
            barOptions: {
                xAxis: {
                    data: [1, 2, 3, 4, 5]
                },
                series: [
                    {
                        name: CV.i18n('feedback.ratings'),
                        data: [0, 0, 0, 0, 0]
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
            cumulativeData: [],
            rating: {},
            platform_version: {},
            sum: 0,
            avg: 0,
            count: 0,
            comments: [],
            platformOptions: [{label: 'All Platforms', value: ''}],
            widgetOptions: [{label: 'All Widgets', value: ''}],
            versionOptions: [{label: 'All Versions', value: ''}]
        };
    },
    methods: {
        refresh: function() {
            this.fetch();
        },
        matchPlatformVersion: function(documentName) {
            var regexString = '';
            if (this.activeFilter.platform === '') {
                regexString += '(\\w+)(\\*\\*)';
            }
            else {
                regexString += this.activeFilter.platform.toString().toUpperCase() + '(\\*\\*)';
            }
            if (this.activeFilter.version === '') {
                regexString += '(\\w+)(\\S*)(\\w*)(\\*\\*)[1-5]';
            }
            else {
                regexString += this.activeFilter.version.toString() + '(\\*\\*)[1-5]';
            }
            if (this.activeFilter.widget !== '') {
                regexString += '(\\*\\*)' + this.activeFilter.widget.toString();
            }
            return (new RegExp(regexString, 'i')).test(documentName);
        },
        calCumulativeData: function() {
            var self = this;
            // reset values
            self.count = 0;
            self.avg = 0;
            self.sum = 0;
            // reset cumulative data
            self.cumulativeData = [{
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
            var result = self.rating;
            var periodArray = countlyCommon.getPeriodObj().currentPeriodArr;

            // prepare cumulative data by period object
            for (var i = 0; i < periodArray.length; i++) {
                var dateArray = periodArray[i].split('.');
                var year = dateArray[0];
                var month = dateArray[1];
                var day = dateArray[2];
                if (result[year] && result[year][month] && result[year][month][day]) {
                    for (var rating in result[year][month][day]) {
                        if (self.matchPlatformVersion(rating)) {
                            var rank = (rating.split("**"))[2];
                            if (self.cumulativeData[rank - 1]) {
                                self.cumulativeData[rank - 1].count += result[year][month][day][rating].c;
                                self.count += result[year][month][day][rating].c;
                                self.sum += (result[year][month][day][rating].c * rank);
                                self.avg = self.sum / self.count;
                                var times = result[year][month][day][rating].c;
                                while (times--) {
                                    ratingArray.push(parseInt(rank));
                                }
                            }
                        }
                    }
                }
            }

            // reset chart data
            self.barOptions.series[0].data = [];
            // prepare sum, count and chart data
            self.cumulativeData.forEach(function(star) {
                self.barOptions.series[0].data.push(star.count);
            });

            // prepare percent values in cumulative data
            self.cumulativeData.forEach(function(star) {
                if (self.count !== 0) {
                    star.percent = ((star.count / self.count) * 100).toFixed(1);
                }
            });

            ratingArray.sort();
        },
        fetch: function() {
            var self = this;
            $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackData(self.activeFilter), starRatingPlugin.requestFeedbackWidgetsData())
                .then(function() {
                    // set platform versions for filter
                    self.platform_version = starRatingPlugin.getPlatformVersion();
                    self.widgets = starRatingPlugin.getFeedbackWidgetsData();
                    // set rating data for charts
                    // calculate cumulative data for chart
                    self.rating = starRatingPlugin.getRatingInPeriod();
                    self.calCumulativeData();
                    // set comments data for all widgets
                    self.feedbackData = starRatingPlugin.getFeedbackData();
                });
        },
        prepareVersions: function(newValue) {
            var self = this;
            self.versionOptions = [{label: 'All Versions', value: ''}];
            if (newValue.platform !== '') {
                for (var i = 0; i < self.platform_version[newValue.platform].length; i++) {
                    self.versionOptions.push({ label: self.platform_version[newValue.platform][i], value: self.platform_version[newValue.platform][i] });
                }
            }
        },
        filterUpdated: function() {
            //this.fetch();
            this.calCumulativeData();
        }
    },
    computed: {
        activeFilterFields: function() {
            var self = this;
            self.platformOptions = [{label: 'All Platforms', value: ''}];
            self.widgetOptions = [{label: 'All Widgets', value: ''}];

            for (var platform in self.platform_version) {
                self.platformOptions.push({ label: platform, value: platform });
            }

            for (var widget in self.widgets) {
                self.widgetOptions.push({ label: self.widgets[widget].popup_header_text, value: self.widgets[widget]._id });
            }

            return [
                {
                    label: "Platform",
                    key: "platform",
                    items: self.platformOptions,
                    default: ""
                },
                {
                    label: "App Version",
                    key: "version",
                    items: self.versionOptions,
                    default: ""
                },
                {
                    label: "Widget",
                    key: "widget",
                    items: self.widgetOptions,
                    default: ""
                }
            ];
        }
    },
    created: function() {
        this.fetch();
    }
});

var WidgetsTab = countlyVue.views.create({
    template: CV.T("/star-rating/templates/widgets-tab.html"),
    components: {
        'widgets-table': WidgetsTable,
        'drawer': Drawer
    },
    mixins: [
        countlyVue.mixins.hasDrawers("widget")
    ],
    data: function() {
        return {
            widgets: [],
            drawerSettings: {
                createTitle: CV.i18n('feedback.add-widget'),
                editTitle: CV.i18n('feedback.edit-widget'),
                saveButtonLabel: CV.i18n('common.save'),
                createButtonLabel: CV.i18n('common.create'),
                isEditMode: false
            },
            widget: '',
            rating: {}
        };
    },
    methods: {
        createWidget: function() {
            // TODO: move this to model
            // TODO: localizations
            this.openDrawer("widget", {
                popup_header_text: 'What\'s your opinion about this page?',
                popup_thanks_message: 'Thanks for your feedback!',
                popup_button_callout: 'Submit Feedback',
                rating_symbol: 'emojis',
                trigger_position: 'mleft',
                trigger_size: 'm',
                contact_enable: false,
                popup_email_callout: 'Contact me e-mail',
                popup_comment_callout: 'Add comment',
                comment_enable: false,
                ratings_texts: [
                    'Very dissatisfied',
                    'Somewhat dissatisfied',
                    'Neither satisfied Nor Dissatisfied',
                    'Somewhat Satisfied',
                    'Very Satisfied'
                ],
                targeting: {
                    user_segmentation: null,
                    steps: null
                },
                trigger_button_text: 'Feedback',
                trigger_bg_color: '#123456',
                trigger_font_color: '#fff',
                hide_sticker: false,
                status: true,
                logo: null
            });
        },
        refresh: function() {
            this.fetch();
        },
        setWidget: function(row, status) {
            var self = this;
            starRatingPlugin.editFeedbackWidget({ _id: row._id, status: status }, function() {
                self.$message({
                    type: 'success',
                    message: CV.i18n('feedback.successfully-updated')
                });
            });
        },
        matchPlatformVersion: function(documentName) {
            var regexString = '';
            if (this.widget !== '') {
                regexString += '(\\*\\*)' + this.widget;
            }
            return (new RegExp(regexString, 'i')).test(documentName);
        },
        calRatingsCountForWidgets: function() {
            var self = this;
            var count = 0;
            var result = self.rating;
            var periodArray = countlyCommon.getPeriodObj().currentPeriodArr;

            // prepare cumulative data by period object
            for (var i = 0; i < periodArray.length; i++) {
                var dateArray = periodArray[i].split('.');
                var year = dateArray[0];
                var month = dateArray[1];
                var day = dateArray[2];
                if (result[year] && result[year][month] && result[year][month][day]) {
                    for (var rating in result[year][month][day]) {
                        if (self.matchPlatformVersion(rating)) {
                            var rank = (rating.split("**"))[2];
                            if (self.cumulativeData[rank - 1]) {
                                count += result[year][month][day][rating].c;
                            }
                        }
                    }
                }
            }

            for (var index = 0; index < self.widgets.length; index++) {
                if (self.widgets[index]._id === self.widget) {
                    self.widgets[index].ratingsCount = count;
                }
            }
        },
        fetch: function() {
            var self = this;
            $.when(starRatingPlugin.requestFeedbackWidgetsData(), starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod())
                .then(function() {
                    // set platform versions for filter
                    self.platform_version = starRatingPlugin.getPlatformVersion();
                    // set rating data for charts
                    // calculate cumulative data for chart
                    self.rating = starRatingPlugin.getRatingInPeriod();
                    self.widgets = starRatingPlugin.getFeedbackWidgetsData();
                });
        }
    },
    created: function() {
        this.fetch();
    }
});

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
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/ratings'
                },
                {
                    title: CV.i18n('feedback.widgets'),
                    name: 'widgets',
                    component: WidgetsTab,
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/widgets'
                }
            ]
        };
    }
});

var WidgetDetail = countlyVue.views.create({
    template: CV.T("/star-rating/templates/widget-detail.html"),
    components: {
        'drawer': Drawer
    },
    mixins: [
        countlyVue.mixins.hasDrawers("widget")
    ],
    data: function() {
        return {
            cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1,
            activeFilter: {
                platform: "",
                version: "",
                widget: ""
            },
            widget: {},
            dynamicTab: (this.$route.params && this.$route.params.tab) || "ratings-table",
            barOptions: {
                xAxis: {
                    data: [1, 2, 3, 4, 5]
                },
                series: [
                    {
                        name: CV.i18n('feedback.ratings'),
                        data: [0, 0, 0, 0, 0]
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
            feedbackData: [],
            cumulativeData: [],
            count: 0,
            sum: 0,
            rating: {},
            timesShown: 0,
            drawerSettings: {
                createTitle: CV.i18n('feedback.add-widget'),
                editTitle: CV.i18n('feedback.edit-widget'),
                saveButtonLabel: CV.i18n('common.save'),
                createButtonLabel: CV.i18n('common.create'),
                isEditMode: true
            },
            platformOptions: [{label: 'All Platforms', value: ''}],
            versionOptions: [{label: 'All Versions', value: ''}],
            platform_version: {}
        };
    },
    methods: {
        backToWidgets: function() {
            window.location.hash = '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/widgets';
        },
        calCumulativeData: function() {
            var self = this;
            // reset values
            self.count = 0;
            self.avg = 0;
            self.sum = 0;
            // reset cumulative data
            self.cumulativeData = [{
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
            var result = self.rating;
            var periodArray = countlyCommon.getPeriodObj().currentPeriodArr;

            // prepare cumulative data by period object
            for (var i = 0; i < periodArray.length; i++) {
                var dateArray = periodArray[i].split('.');
                var year = dateArray[0];
                var month = dateArray[1];
                var day = dateArray[2];
                if (result[year] && result[year][month] && result[year][month][day]) {
                    for (var rating in result[year][month][day]) {
                        if (self.matchPlatformVersion(rating)) {
                            var rank = (rating.split("**"))[2];
                            if (self.cumulativeData[rank - 1]) {
                                self.cumulativeData[rank - 1].count += result[year][month][day][rating].c;
                                self.count += result[year][month][day][rating].c;
                                self.sum += (result[year][month][day][rating].c * rank);
                                self.avg = self.sum / self.count;
                                var times = result[year][month][day][rating].c;
                                while (times--) {
                                    ratingArray.push(parseInt(rank));
                                }
                            }
                        }
                    }
                }
            }

            // reset chart data
            self.barOptions.series[0].data = [];
            // prepare sum, count and chart data
            self.cumulativeData.forEach(function(star) {
                self.barOptions.series[0].data.push(star.count);
            });

            // prepare percent values in cumulative data
            self.cumulativeData.forEach(function(star) {
                if (self.count !== 0) {
                    star.percent = ((star.count / self.count) * 100).toFixed(1);
                }
            });

            ratingArray.sort();
        },
        setWidget: function(state) {
            var self = this;
            starRatingPlugin.editFeedbackWidget({ _id: this.widget._id, status: (state) }, function() {
                self.widget.is_active = (state ? "true" : "false");
                self.widget.status = state;

                self.$message({
                    type: 'success',
                    message: CV.i18n('feedback.successfully-updated')
                });
            });
        },
        editWidget: function() {
            if (this.cohortsEnabled && this.widget.targeting.user_segmentation && this.widget.targeting.user_segmentation.query && typeof this.widget.targeting.user_segmentation.query === "object") {
                this.widget.targeting.user_segmentation.query = JSON.stringify(this.widget.targeting.user_segmentation.query);
            }
            this.openDrawer('widget', this.widget);
        },
        handleCommand: function(command) {
            var self = this;
            switch (command) {
            case 'delete-widget':
                starRatingPlugin.removeFeedbackWidget(self.widget._id, false, function() {
                    self.$message({
                        type: 'success',
                        message: CV.i18n('feedback.successfully-removed')
                    });
                    window.location.hash = "#/" + countlyCommon.ACTIVE_APP_ID + "/feedback/ratings/widgets";
                });
                break;
            }
        },
        matchPlatformVersion: function(documentName) {
            var regexString = '';
            if (this.activeFilter.platform === '') {
                regexString += '(\\w+)(\\*\\*)';
            }
            else {
                regexString += this.activeFilter.platform.toString().toUpperCase() + '(\\*\\*)';
            }
            if (this.activeFilter.version === '') {
                regexString += '(\\w+)(\\S*)(\\w*)(\\*\\*)[1-5]';
            }
            else {
                regexString += this.activeFilter.version.toString() + '(\\*\\*)[1-5]';
            }
            if (this.activeFilter.widget !== '') {
                regexString += '(\\*\\*)' + this.activeFilter.widget;
            }
            return (new RegExp(regexString, 'i')).test(documentName);
        },
        refresh: function() {
            this.fetch();
        },
        fetch: function() {
            var self = this;
            this.activeFilter.widget = this.$route.params.id;

            starRatingPlugin.requestSingleWidget(this.$route.params.id, function(widget) {
                self.widget = widget;
                self.widget.created_at = countlyCommon.formatTimeAgo(self.widget.created_at);
                if (self.cohortsEnabled) {
                    self.widget = self.parseTargeting(widget);
                }
            });
            // set widget filter as current one
            this.activeFilter.widget = this.widget._id;
            $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackData(self.activeFilter))
                .then(function() {
                    // set platform versions for filter
                    self.platform_version = starRatingPlugin.getPlatformVersion();
                    // set rating data for charts
                    // calculate cumulative data for chart
                    self.rating = starRatingPlugin.getRatingInPeriod();
                    self.calCumulativeData();
                    // set comments data for all widgets
                    self.feedbackData = starRatingPlugin.getFeedbackData();
                });
        },
        prepareVersions: function(newValue) {
            var self = this;
            self.versionOptions = [{label: 'All Versions', value: ''}];
            if (newValue.platform !== '') {
                for (var i = 0; i < self.platform_version[newValue.platform].length; i++) {
                    self.versionOptions.push({ label: self.platform_version[newValue.platform][i], value: self.platform_version[newValue.platform][i] });
                }
            }
        },
        parseTargeting: function(widget) {
            if (typeof widget.targeting.steps === "string") {
                widget.targeting.steps = JSON.parse(widget.targeting.steps);
            }
            if (typeof widget.targeting.user_segmentation === "string") {
                widget.targeting.user_segmentation = JSON.parse(widget.targeting.user_segmentation);
            }
            return widget;
        }
    },
    computed: {
        activeFilterFields: function() {
            var self = this;
            self.platformOptions = [{label: 'All Platforms', value: ''}];

            for (var platform in self.platform_version) {
                self.platformOptions.push({ label: platform, value: platform });
            }

            return [
                {
                    label: "Platform",
                    key: "platform",
                    items: self.platformOptions,
                    default: ""
                },
                {
                    label: "App Version",
                    key: "version",
                    items: self.versionOptions,
                    default: ""
                }
            ];
        },
        ratingRate: function() {
            return parseFloat(((this.count / this.widget.timesShown) * 100).toFixed(2)) || 0;
        }
    },
    mounted: function() {
        this.fetch();
    }
});

var UserFeedbackRatingsTable = countlyVue.views.create({
    template: CV.T('/star-rating/templates/users-feedback-ratings-table.html'),
    props: {
        ratings: {
            type: Array,
            default: function() {
                return [
                    {
                        widget: '1',
                        rating: 1,
                        time: 1
                    },
                    {
                        widget: '2',
                        rating: 2,
                        time: 2
                    },
                    {
                        widget: '3',
                        rating: 3,
                        time: 3
                    },
                    {
                        widget: '4',
                        rating: 4,
                        time: 4
                    },
                    {
                        widget: '5',
                        rating: 5,
                        time: 5
                    }];
            }
        }
    }
});

// create vue view
countlyVue.container.registerTab("/users/tabs", {
    priority: 1,
    title: 'Feedback',
    name: 'feedback',
    component: countlyVue.components.create({
        template: CV.T("/star-rating/templates/users-tab.html"),
        components: {
            'user-feedback-ratings-table': UserFeedbackRatingsTable
        },
        data: function() {
            return {
                uid: '',
                ratingsData: [],
                title: CV.i18n('feedback.ratings')
            };
        },
        methods: {},
        created: function() {
            this.uid = this.$route.params.uid;
            var self = this;
            starRatingPlugin.requestFeedbackData({uid: this.uid, period: "12months"})
                .then(function() {
                    self.ratingsData = starRatingPlugin.getFeedbackData().aaData;
                    self.ratingsData.map(function(rating) {
                        rating.ts = countlyCommon.formatTimeAgo(rating.ts);
                        starRatingPlugin.requestSingleWidget(rating.widget_id, function(widget) {
                            if (widget) {
                                rating.widgetTitle = widget.popup_header_text;
                            }
                            else {
                                rating.widgetTitle = "Widget not exist";
                            }

                            return rating;
                        });
                    });
                });
        }
    })
});

var RatingsMainView = new countlyVue.views.BackboneWrapper({
    component: RatingsMain
});

var WidgetDetailView = new countlyVue.views.BackboneWrapper({
    component: WidgetDetail
});

app.ratingsMainView = RatingsMainView;
app.widgetDetailView = WidgetDetailView;

if (countlyAuth.validateRead(FEATURE_NAME)) {
    app.route("/feedback/ratings", 'ratings', function() {
        this.renderWhenReady(this.ratingsMainView);
    });

    app.route("/feedback/ratings/:tab", 'ratings-with-tab', function(tab) {
        this.ratingsMainView.params = {
            tab: tab
        };
        this.renderWhenReady(this.ratingsMainView);
    });

    app.route("/feedback/ratings/widgets/:widget", 'widget-detail', function(widget) {
        this.widgetDetailView.params = {
            id: widget
        };
        this.renderWhenReady(this.widgetDetailView);
    });

    app.addPageScript("/manage/reports", function() {
        countlyReporting.addMetric({name: jQuery.i18n.map["reports.star-rating"], value: "star-rating"});
    });
}

/*
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
*/

$(document).ready(function() {
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.addSubMenu("feedback", {
            code: "star-rating",
            url: "#/feedback/ratings",
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