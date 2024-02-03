/*global $, countlyReporting, countlyGlobal, CountlyHelpers, starRatingPlugin, app, jQuery, countlyPlugins, countlyCommon,  CV, countlyVue, moment, countlyCohorts*/
(function() {
    var FEATURE_NAME = 'star_rating';

    /**
    * Replace escaped characters
    * @param {string} str - string to replace
    * @returns {string} - replaced escaped characters
    */
    function replaceEscapes(str) {
        if (typeof str === 'string') {
            return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        }
        return str;
    }

    var Drawer = countlyVue.views.create({
        mixins: [countlyVue.mixins.commonFormatters],
        template: CV.T("/star-rating/templates/drawer.html"),
        props: {
            settings: Object,
            controls: Object
        },
        data: function() {
            return {
                imageSource: '',
                deleteLogo: false,
                imageSrc: '',
                logoType: 'default',
                globalLogo: false,
                ratingItem: [ { active: false, inactive: false }, { active: false, inactive: false }, { active: false, inactive: false }, { active: false, inactive: false }, { active: false, inactive: false }],
                constants: {
                // TODO: will be localized
                    trigger_sizes: [{label: 'Small', value: 's'}, {label: 'Medium', value: 'm'}, {label: 'Large', value: 'l'}],
                    logoOptions: [
                        { label: this.i18n("surveys.appearance.logo.option.default"), value: "default" },
                        { label: this.i18n("surveys.appearance.logo.option.custom"), value: "custom" },
                        { label: this.i18n("surveys.appearance.logo.option.no.logo"), value: "none" }
                    ],
                    trigger_positions: [{value: 'mleft', label: 'Center left', key: 'middle-left'}, { value: 'mright', label: 'Center right', key: 'middle-right' }, { value: 'bleft', label: 'Bottom left', key: 'bottom-left'}, { value: 'bright', label: 'Bottom right', key: 'bottom-right' }]
                },
                ratingSymbols: ['emojis', 'thumbs', 'stars'],
                logoDropzoneOptions: {
                    createImageThumbnails: false,
                    maxFilesize: 2, // MB
                    autoProcessQueue: false,
                    addRemoveLinks: true,
                    acceptedFiles: 'image/jpeg,image/png,image/gif',
                    dictDefaultMessage: this.i18n('feedback.drop-message'),
                    dictRemoveFile: this.i18n('feedback.remove-file'),
                    url: "/i/feedback/logo" + "?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                    paramName: "logo",
                    params: { _csrf: countlyGlobal.csrf_token, identifier: '' }
                },
                logoFile: "",
                stamp: 0,
                cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1
            };
        },
        watch: {
            imageSource: {
                immediate: true,
                handler: function(newValue) {
                    this.imageSrc = newValue;
                }
            },
        },
        methods: {
        // drawer event handlers
            onClose: function() {},
            setRatingItemActive: function(index) {
                var self = this;
                this.ratingItem.forEach(function(item) {
                    if (self.ratingItem.indexOf(item) > index) {
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

                if (!this.imageSource || submitted.logoType !== 'custom') {
                    submitted.logo = '';
                }

                if (!submitted.logoType) {
                    submitted.logoType = 'default';
                }
                if (!submitted.globalLogo) {
                    submitted.globalLogo = false;
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

                if (submitted.target_page) {
                    submitted.target_page = "selected";
                }
                else {
                    submitted.target_page = "all";
                    submitted.target_pages = ["/"];
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
            onOpen: function() {
                var self = this;
                var loadImage = new Image();
                if (this.controls.initialEditedObject.logo) {

                    if (this.controls.initialEditedObject.logo.indexOf("feedback_logo") > -1
                    ) {
                        loadImage.src = window.location.origin + this.controls.initialEditedObject.logo;
                    }
                    else {
                        loadImage.src = window.location.origin + "/star-rating/images/" + this.controls.initialEditedObject.logo;
                    }
                }
                loadImage.onload = function() {
                    self.imageSource = loadImage.src;
                };
            },
            onFileRemoved: function() {
                this.imageSource = '';
                this.deleteLogo = true;
            },
            onFileAdded: function(file) {
                this.deleteLogo = false;
                var img = new FileReader();
                var self = this;
                img.onload = function() {
                    self.imageSource = img.result;
                };
                img.readAsDataURL(file);
                this.stamp = Date.now();
                this.logoDropzoneOptions.params.identifier = this.stamp;
                setTimeout(function() {
                    self.$refs.logoDropzone.processQueue();
                }, 1);
            },
            onComplete: function(res) {
                var fileName = res.upload.filename;
                var fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
                this.logoFile = this.stamp + '.' + fileExtension;
            },
            remove: function() {
                this.imageSource = '';
                this.deleteLogo = true;
            }
        }
    });

    // these table components should be 3 different components
    var CommentsTable = countlyVue.views.create({
        mixins: [countlyVue.mixins.commonFormatters],
        template: CV.T("/star-rating/templates/comments-table.html"),
        props: {
            comments: Array,
            loadingState: Boolean,
            filter: {
                type: Object,
                default: {},
                required: false
            }
        },
        watch: {
            filter: {
                immediate: true,
                handler: function(newValue) {
                    this.filterVal = newValue;
                    this.tableStore.dispatch("fetchCommentsTable");
                }
            },
        },
        methods: {
            dateChanged: function() {
                this.tableStore.dispatch("fetchCommentsTable");
            },
            decode: function(str) {
                if (typeof str === 'string') {
                    return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                }
                return str;
            }
        },
        computed: {
            preparedRows: function() {
                var self = this;
                return this.comments.map(function(comment) {
                    comment.cd = countlyCommon.formatTimeAgoText(comment.cd).tooltip;
                    comment.time = moment.unix(comment.ts).format("DD MMMM YYYY HH:MM:SS");
                    comment.comment = self.decode(comment.comment);
                    return comment;
                });
            }
        },
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("commentsTable", {
                columns: ['comment', 'cd', 'email', 'rating'],
                onRequest: function() {
                    const data = {app_id: countlyCommon.ACTIVE_APP_ID, period: countlyCommon.getPeriodForAjax()};
                    var filter = self.filterVal;
                    if (filter) {
                        if (filter.rating && filter.rating !== "") {
                            data.rating = filter.rating;
                        }
                        if (filter.version && filter.version !== "") {
                            data.version = filter.version.replace(":", ".");
                        }
                        if (filter.platform && filter.platform !== "") {
                            data.platform = filter.platform;
                        }
                        if (filter.widget && filter.widget !== "") {
                            data.widget_id = filter.widget;
                        }
                        if (filter.uid && filter.uid !== "") {
                            data.uid = filter.uid;
                        }
                    }
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o/feedback/data",
                        data: data
                    };
                },
                onError: function(context, err) {
                    throw err;
                },
                onReady: function(context, rows) {
                    rows.forEach(function(row) {
                        row.cd = countlyCommon.formatTimeAgoText(row.cd).tooltip;
                        row.time = moment.unix(row.ts).format("DD MMMM YYYY HH:MM:SS");
                        row.comment = replaceEscapes(row.comment);
                    });
                    return rows;
                },
            }));
            return {
                tableStore: tableStore,
                filterVal: this.filter,
                commentsTablePersistKey: 'comments_table_' + countlyCommon.ACTIVE_APP_ID,
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "commentsTable"),
            };
        }
    });

    var RatingsTable = countlyVue.views.create({
        template: CV.T("/star-rating/templates/ratings-table.html"),
        props: {
            ratings: Array,
            loadingState: Boolean
        },
        computed: {
            preparedRows: function() {
                return this.ratings.map(function(rating) {
                    rating.percentage = parseFloat(rating.percent) || 0;
                    return rating;
                });
            }
        },
        data: function() {
            return {
                ratingsTablePersistKey: 'ratings_table_' + countlyCommon.ACTIVE_APP_ID
            };
        }
    });

    var WidgetsTable = countlyVue.views.create({
        template: CV.T("/star-rating/templates/widgets-table.html"),
        mixins: [
            countlyVue.mixins.auth(FEATURE_NAME),
            countlyVue.mixins.commonFormatters
        ],
        props: {
            rows: {
                type: Array,
                default: []
            },
            loading: {
                type: Boolean,
                default: true
            }
        },
        data: function() {
            return {
                cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1,
                persistKey: 'ratingsWidgetsTable_' + countlyCommon.ACTIVE_APP_ID,
                tableDynamicCols: [
                    {
                        value: "target_pages",
                        label: CV.i18n("feedback.pages"),
                        default: true,
                        required: true
                    }
                ],
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
                    this.rows[i].popup_header_text = replaceEscapes(this.rows[i].popup_header_text);
                    if (this.cohortsEnabled) {
                        this.rows[i] = this.parseTargeting(this.rows[i]);
                    }
                    this.rows[i].target_pages = this.rows[i].target_pages && this.rows[i].target_pages.length > 0 ? this.rows[i].target_pages.join(", ") : "-";
                }
                return this.rows;
            }
        },
        methods: {
            parseTargetingForExport: function(widget) {
                var targeting = countlyCohorts.getSegmentationDescription(widget);
                var html = targeting.behavior;
                var div = document.createElement('div');
                div.innerHTML = html;
                return div.textContent || div.innerText || "";
            },
            formatExportFunction: function() {
                var tableData = this.widgets;
                var table = [];
                for (var i = 0; i < tableData.length; i++) {
                    var item = {};

                    item[CV.i18n('feedback.status').toUpperCase()] = tableData[i].status ? "Active" : "Inactive";
                    item[CV.i18n('feedback.ratings-widget-name').toUpperCase()] = tableData[i].popup_header_text;
                    item[CV.i18n('feedback.widget-id').toUpperCase()] = tableData[i]._id;
                    item[CV.i18n('feedback.targeting').toUpperCase()] = this.parseTargetingForExport(tableData[i].targeting).trim();
                    item[CV.i18n('feedback.rating-score').toUpperCase()] = tableData[i].ratingScore;
                    item[CV.i18n('feedback.responses').toUpperCase()] = tableData[i].ratingsCount;
                    item[CV.i18n('feedback.pages').toUpperCase()] = tableData[i].target_pages;

                    table.push(item);
                }
                return table;

            },
            goWidgetDetail: function(id) {
                window.location.hash = "#/" + countlyCommon.ACTIVE_APP_ID + "/feedback/ratings/widgets/" + id;
            },
            parseTargeting: function(widget) {
                if (widget.targeting) {
                    try {
                        if (typeof widget.targeting.user_segmentation === "string") {
                            widget.targeting.user_segmentation = JSON.parse(widget.targeting.user_segmentation);
                        }
                    }
                    catch (e) {
                        widget.targeting.user_segmentation = {};
                    }

                    try {
                        if (typeof widget.targeting.steps === "string") {
                            widget.targeting.steps = JSON.parse(widget.targeting.steps);
                        }
                    }
                    catch (e) {
                        widget.targeting.steps = [];
                    }

                    widget.targeting.user_segmentation = widget.targeting.user_segmentation || {};
                    widget.targeting.steps = widget.targeting.steps || [];
                }
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
                        component: RatingsTable,
                        dataTestId: "ratings-data-table-tab-ratings"
                    },
                    {
                        title: CV.i18n('feedback.comments'),
                        name: 'comments-table',
                        component: CommentsTable,
                        dataTestId: "ratings-data-table-tab-comments"
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
                versionOptions: [{label: 'All Versions', value: ''}],
                isLoading: false
            };
        },
        methods: {
            refresh: function(force) {
                this.fetch(force);
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
                    rating: 0,
                    count: 0,
                    percent: 0
                }, {
                    rating: 1,
                    count: 0,
                    percent: 0
                }, {
                    rating: 2,
                    count: 0,
                    percent: 0
                }, {
                    rating: 3,
                    count: 0,
                    percent: 0
                }, {
                    rating: 4,
                    count: 0,
                    percent: 0
                }];

                var ratingArray = [];
                var result = self.rating;
                var periodArray = countlyCommon.getPeriodObj().currentPeriodArr;

                var idMap = {};
                self.widgets.forEach(function(obj) {
                    idMap[obj._id] = obj;
                });

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
                                var widget = (rating.split("**"))[3];
                                if (self.cumulativeData[rank - 1] && idMap[widget]) {
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
            fetch: function(force) {
                var self = this;
                if (force) {
                    self.isLoading = true;
                }
                $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackWidgetsData())
                    .then(function() {
                        self.isLoading = false;
                        // set platform versions for filter
                        self.platform_version = starRatingPlugin.getPlatformVersion();
                        self.widgets = starRatingPlugin.getFeedbackWidgetsData();
                        // set rating data for charts
                        // calculate cumulative data for chart
                        self.rating = starRatingPlugin.getRatingInPeriod();
                        self.calCumulativeData();
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
                        dataTestId: {label: "ratings-filter-parameters-platform-label", dropdown: "ratings-filter-parameters-platform-dropdown"},
                        default: ""
                    },
                    {
                        label: "App Version",
                        key: "version",
                        items: self.versionOptions,
                        dataTestId: {label: "ratings-filter-parameters-version-label", dropdown: "ratings-filter-parameters-version-dropdown"},
                        default: ""
                    },
                    {
                        label: "Widget",
                        key: "widget",
                        items: self.widgetOptions,
                        dataTestId: {label: "ratings-filter-parameters-widget-label", dropdown: "ratings-filter-parameters-widget-dropdown"},
                        default: ""
                    }
                ];
            }
        },
        created: function() {
            this.fetch(true);
        }
    });

    var WidgetsTab = countlyVue.views.create({
        template: CV.T("/star-rating/templates/widgets-tab.html"),
        components: {
            'widgets-table': WidgetsTable,
            'drawer': Drawer
        },
        mixins: [
            countlyVue.mixins.hasDrawers("widget"),
            countlyVue.mixins.auth(FEATURE_NAME)
        ],
        data: function() {
            return {
                empty: {
                    title: CV.i18n("ratings.empty.title"),
                    body: CV.i18n("ratings.empty.body"),
                    image: "/star-rating/images/star-rating/ratings-empty.svg"
                },
                widgets: [],
                drawerSettings: {
                    createTitle: CV.i18n('feedback.add-widget'),
                    editTitle: CV.i18n('feedback.edit-widget'),
                    saveButtonLabel: CV.i18n('common.save'),
                    createButtonLabel: CV.i18n('common.create'),
                    isEditMode: false
                },
                widget: '',
                rating: {},
                loading: true,
                cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1
            };
        },
        methods: {
            createWidget: function() {
            // TODO: move this to model
            // TODO: localizations
                var trigger_bg_color = '#123456';
                var trigger_font_color = '#fff';
                var logoType = 'default';
                var logo = null;
                var globalLogo = false;
                if ((countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.feedbackApp) || countlyPlugins.getConfigsData().feedback) {
                    var feedbackApp = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.feedbackApp ? countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.feedbackApp : null;
                    var feedback = countlyPlugins.getConfigsData().feedback;
                    if (feedbackApp && feedbackApp.main_color) {
                        trigger_bg_color = feedbackApp.main_color;
                    }
                    else if (countlyPlugins.getConfigsData().feedback) {
                        trigger_bg_color = feedback.main_color;
                    }
                    if (feedbackApp && feedbackApp.font_color) {
                        trigger_font_color = feedbackApp.font_color;
                    }
                    else if (countlyPlugins.getConfigsData().feedback) {
                        trigger_font_color = feedback.font_color;
                    }
                    if (feedbackApp && feedbackApp.feedback_logo) {
                        logo = '/feedback/preview/' + feedbackApp.feedback_logo;
                        logoType = 'custom';
                        globalLogo = true;
                    }
                    else if (countlyPlugins.getConfigsData().feedback && countlyPlugins.getConfigsData().feedback.feedback_logo) {
                        logo = '/feedback/preview/' + feedback.feedback_logo;
                        logoType = 'custom';
                        globalLogo = true;
                    }
                }
                this.openDrawer("widget", {
                    popup_header_text: 'What\'s your opinion about this page?',
                    popup_thanks_message: 'Thanks for your feedback!',
                    popup_button_callout: 'Submit Feedback',
                    rating_symbol: 'emojis',
                    trigger_position: 'mleft',
                    trigger_size: 'm',
                    contact_enable: false,
                    popup_email_callout: 'Contact me via e-mail',
                    popup_comment_callout: 'Add comment',
                    comment_enable: false,
                    ratings_texts: [
                        'Very Dissatisfied',
                        'Somewhat Dissatisfied',
                        'Neither Satisfied Nor Dissatisfied',
                        'Somewhat Satisfied',
                        'Very Satisfied'
                    ],
                    targeting: {
                        user_segmentation: null,
                        steps: null
                    },
                    trigger_button_text: 'Feedback',
                    trigger_bg_color: trigger_bg_color,
                    trigger_font_color: trigger_font_color,
                    hide_sticker: false,
                    status: true,
                    logo: logo,
                    target_pages: ["/"],
                    target_page: false,
                    logoType: logoType,
                    globalLogo: globalLogo,
                });
            },
            refresh: function(force) {
                this.fetch(force);
            },
            setWidget: function(row, status) {
                var finalizedTargeting = null;
                var target_pages = row.target_pages === "-" ? [] : row.target_pages.split(", ");
                if (this.cohortsEnabled) {
                    var exported = row.targeting;
                    if (exported && !((exported.steps && exported.steps.length === 0) && (exported.user_segmentation && Object.keys(exported.user_segmentation.query).length === 0))) {
                        finalizedTargeting = Object.assign({}, {
                            user_segmentation: JSON.stringify(exported.user_segmentation),
                            steps: JSON.stringify(exported.steps)
                        });
                    }

                }
                starRatingPlugin.editFeedbackWidget({ _id: row._id, status: status, target_pages: target_pages, targeting: finalizedTargeting }, function() {
                    CountlyHelpers.notify({
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
            fetch: function(force) {
                var self = this;
                if (force) {
                    this.loading = true;
                }
                $.when(starRatingPlugin.requestFeedbackWidgetsData(), starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod())
                    .then(function() {
                    // set platform versions for filter
                        self.platform_version = starRatingPlugin.getPlatformVersion();
                        // set rating data for charts
                        // calculate cumulative data for chart
                        self.rating = starRatingPlugin.getRatingInPeriod();
                        self.widgets = starRatingPlugin.getFeedbackWidgetsData();
                        self.loading = false;
                    });
            }
        },
        created: function() {
            this.fetch(true);
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
                        route: '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/ratings',
                        dataTestId: "ratings-tab-ratings"
                    },
                    {
                        title: CV.i18n('feedback.widgets'),
                        name: 'widgets',
                        component: WidgetsTab,
                        route: '#/' + countlyCommon.ACTIVE_APP_ID + '/feedback/ratings/widgets',
                        dataTestId: "ratings-tab-rating-widgets"
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
            countlyVue.mixins.hasDrawers("widget"),
            countlyVue.mixins.auth(FEATURE_NAME),
            countlyVue.mixins.commonFormatters
        ],
        data: function() {
            return {
                activeNames: [1],
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
                        component: RatingsTable,
                        dataTestId: "ratings-detail-table-tab-ratings"
                    },
                    {
                        title: CV.i18n('feedback.comments'),
                        name: 'comments-table',
                        component: CommentsTable,
                        dataTestId: "ratings-detail-table-tab-comments"
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
                platform_version: {},
                isLoading: false
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
                    percent: 0,
                    rating: 0
                }, {
                    count: 0,
                    percent: 0,
                    rating: 1
                }, {
                    count: 0,
                    percent: 0,
                    rating: 2
                }, {
                    count: 0,
                    percent: 0,
                    rating: 3
                }, {
                    count: 0,
                    percent: 0,
                    rating: 4
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
                var finalizedTargeting = null;
                var target_pages = this.widget.target_pages === "-" ? [] : this.widget.target_pages;
                if (this.cohortsEnabled) {
                    var exported = this.widget.targeting;
                    if (exported && !((exported.steps && exported.steps.length === 0) && (exported.user_segmentation && Object.keys(exported.user_segmentation.query).length === 0))) {
                        finalizedTargeting = Object.assign({}, {
                            user_segmentation: JSON.stringify(exported.user_segmentation),
                            steps: JSON.stringify(exported.steps)
                        });
                    }

                }
                starRatingPlugin.editFeedbackWidget({ _id: this.widget._id, status: (state), target_pages: target_pages, targeting: finalizedTargeting }, function() {
                    self.widget.is_active = (state ? "true" : "false");
                    self.widget.status = state;

                    CountlyHelpers.notify({
                        type: 'success',
                        message: CV.i18n('feedback.successfully-updated')
                    });
                });
            },
            editWidget: function() {
                this.widget.globalLogo = false;
                if (this.cohortsEnabled && this.widget.targeting && this.widget.targeting.user_segmentation && this.widget.targeting.user_segmentation.query && typeof this.widget.targeting.user_segmentation.query === "object") {
                    this.widget.targeting.user_segmentation.query = JSON.stringify(this.widget.targeting.user_segmentation.query);
                }
                else {
                    this.widget.targeting = {
                        user_segmentation: null,
                        steps: null
                    };
                }
                if (!this.widget.rating_symbol) {
                    this.widget.rating_symbol = "emojis";
                }
                if (!this.widget.ratings_texts) {
                    this.widget.ratings_texts = [
                        'Very Dissatisfied',
                        'Somewhat Dissatisfied',
                        'Neither Satisfied Nor Dissatisfied',
                        'Somewhat Satisfied',
                        'Very Satisfied'
                    ];
                }
                if (!this.widget.contact_enable) {
                    this.widget.contact_enable = false;
                }
                if (!this.widget.comment_enable) {
                    this.widget.comment_enable = false;
                }
                if (!this.widget.trigger_size) {
                    this.widget.trigger_size = 'm';
                }
                if (!this.widget.status) {
                    this.widget.status = true;
                }
                if (!this.widget.logo) {
                    this.widget.logo = null;
                }
                if (!this.widget.logoType) {
                    this.widget.logoType = 'default';
                }
                if (this.widget.logo && this.widget.logo.indexOf("feedback_logo")) {
                    this.widget.globalLogo = true;
                }
                if (!this.widget.targeting) {
                    this.widget.targeting = {
                        user_segmentation: null,
                        steps: null
                    };
                }
                this.widget.target_page = this.widget.target_page === "selected";
                this.widget.comment_enable = (this.widget.comment_enable === 'true');
                this.widget.contact_enable = (this.widget.contact_enable === 'true');
                this.openDrawer('widget', this.widget);
            },
            handleCommand: function(command) {
                var self = this;
                switch (command) {
                case 'delete-widget':
                    CountlyHelpers.confirm(CV.i18n('feedback.delete-a-widget-description'), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        starRatingPlugin.removeFeedbackWidget(self.widget._id, false, function() {
                            CountlyHelpers.notify({
                                type: 'success',
                                message: CV.i18n('feedback.successfully-removed')
                            });
                            window.location.hash = "#/" + countlyCommon.ACTIVE_APP_ID + "/feedback/ratings/widgets";
                        });
                    }, [], { image: 'delete-an-app', title: CV.i18n('feedback.delete-a-widget') }, "ratings-detail");
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
            refresh: function(force) {
                this.fetch(force);
            },
            fetch: function(force) {
                var self = this;
                this.activeFilter.widget = this.$route.params.id;

                starRatingPlugin.requestSingleWidget(this.$route.params.id, function(widget) {
                    self.widget = widget;
                    self.widget.popup_header_text = replaceEscapes(self.widget.popup_header_text);
                    self.widget.created_at = countlyCommon.formatTimeAgoText(self.widget.created_at).text;
                    if (self.cohortsEnabled) {
                        self.widget = self.parseTargeting(widget);
                    }
                });
                // set widget filter as current one
                this.activeFilter.widget = this.widget._id || this.$route.params.id;
                if (force) {
                    this.isLoading = true;
                }
                $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod())
                    .then(function() {
                        self.isLoading = false;
                        // set platform versions for filter
                        self.platform_version = starRatingPlugin.getPlatformVersion();
                        // set rating data for charts
                        // calculate cumulative data for chart
                        self.rating = starRatingPlugin.getRatingInPeriod();
                        self.calCumulativeData();
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
                if (widget.targeting) {
                    try {
                        if (typeof widget.targeting.user_segmentation === "string") {
                            widget.targeting.user_segmentation = JSON.parse(widget.targeting.user_segmentation);
                        }
                    }
                    catch (e) {
                        widget.targeting.user_segmentation = {};
                    }

                    try {
                        if (typeof widget.targeting.steps === "string") {
                            widget.targeting.steps = JSON.parse(widget.targeting.steps);
                        }
                    }
                    catch (e) {
                        widget.targeting.steps = [];
                    }

                    widget.targeting.user_segmentation = widget.targeting.user_segmentation || {};
                    widget.targeting.steps = widget.targeting.steps || [];
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
                var timesShown = this.widget.timesShown === 0 || !this.widget.timesShown ? 1 : this.widget.timesShown;
                if (timesShown < this.count) {
                    timesShown = this.count;
                }
                return parseFloat(((this.count / timesShown) * 100).toFixed(2)) || 0;
            }
        },
        mounted: function() {
            this.fetch(true);
        }
    });

    var UserFeedbackRatingsTable = countlyVue.views.create({
        mixins: [countlyVue.mixins.commonFormatters],
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
                        }
                    ];
                }
            },
            isLoading: {
                type: Boolean,
                default: false,
                required: false
            }
        }
    });

    // create vue view
    countlyVue.container.registerTab("/users/tabs", {
        priority: 1,
        title: 'Feedback',
        name: 'feedback',
        permission: FEATURE_NAME,
        pluginName: "star-rating",
        component: countlyVue.components.create({
            template: CV.T("/star-rating/templates/users-tab.html"),
            components: {
                'user-feedback-ratings-table': UserFeedbackRatingsTable
            },
            data: function() {
                return {
                    uid: '',
                    ratingsData: [],
                    title: CV.i18n('feedback.ratings'),
                    isLoading: false
                };
            },
            methods: {},
            created: function() {
                this.uid = this.$route.params.uid;
                var self = this;
                this.isLoading = true;
                starRatingPlugin.requestFeedbackData({uid: this.uid, period: "noperiod"})
                    .then(function() {
                        self.ratingsData = starRatingPlugin.getFeedbackData().aaData;
                        self.ratingsData.map(function(rating) {
                            rating.ts = countlyCommon.formatTimeAgo(rating.ts);
                        });
                        self.isLoading = false;
                    });
            }
        })
    });

    var RatingsMainView = new countlyVue.views.BackboneWrapper({
        component: RatingsMain,
        templates: [
            "/drill/templates/query.builder.v2.html"
        ]
    });

    var WidgetDetailView = new countlyVue.views.BackboneWrapper({
        component: WidgetDetail,
        templates: [
            "/drill/templates/query.builder.v2.html"
        ]
    });

    app.ratingsMainView = RatingsMainView;
    app.widgetDetailView = WidgetDetailView;

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
        countlyReporting.addMetric({name: jQuery.i18n.map["reports.star-rating"], pluginName: "star-rating", value: "star-rating"});
    });

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

    if (app.configurationsView && !app.configurationsView.predefinedLabels["feedback.main_color"]) {
        app.configurationsView.registerLabel("feedback.main_color", "feedback.main_color-title");
        app.configurationsView.registerLabel("feedback.font_color", "feedback.font_color-title");
        app.configurationsView.registerLabel("feedback.feedback_logo", "feedback.logo-title");
        app.configurationsView.registerInput("feedback.main_color", {input: "cly-colorpicker", helper: "feedback.main_color.description", attrs: {resetValue: '#2FA732'}});
        app.configurationsView.registerInput("feedback.font_color", {input: "cly-colorpicker", helper: "feedback.font_color.description", attrs: {resetValue: '#2FA732'}});
        app.configurationsView.registerInput("feedback.feedback_logo", {
            input: "image",
            helper: "feedback.logo.description",
            image_size: "feedback_logo",
            attrs: {
                name: "feedback_logo",
                action: countlyGlobal.path + "/i/feedback/upload",
                data: {auth_token: countlyGlobal.auth_token}
            },
            errorMessage: "",
            success: function() {
                app.configurationsView.predefinedInputs["feedback.feedback_logo"].errorMessage = "";
                if (this.$root && this.$root.$children) {
                    for (var i = 0; i < this.$root.$children.length; i++) {
                        if (this.$root.$children[i].configsData) {
                            this.$root.$children[i].onChange("feedback_logo", "feedback_logo");
                            break;
                        }
                    }
                }
            },
            error: function(err) {
                var message = jQuery.i18n.map["feedback.error"];
                if (err && err.message) {
                    try {
                        var parts = JSON.parse(err.message);
                        var m = parts.message || parts.error || parts.result;
                        message = jQuery.i18n.map[m] || m;
                    }
                    catch (ex) {
                        message = jQuery.i18n.map["feedback.error"];
                    }
                }
                app.configurationsView.predefinedInputs["feedback.feedback_logo"].errorMessage = message;
            },
            data: function() {
                return {
                    id: countlyCommon.ACTIVE_APP_ID,
                };
            },
            before: function(file) {
                var type = file.type;
                if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
                    app.configurationsView.predefinedInputs["feedback.feedback_logo"].errorMessage = jQuery.i18n.map["feedback.imagef-error"];
                    return false;
                }
                if (file.size > 1.5 * 1024 * 1024) {
                    app.configurationsView.predefinedInputs["feedback.feedback_logo"].errorMessage = jQuery.i18n.map["feedback.image-error"];
                    return false;
                }
                return true;
            }
        });
    }

    if (app.appManagementViews && !app.appManagementViews.feedbackApp) {
        var segments = window.location.href.split('/');
        var manageIndex = segments.indexOf('apps');
        var feedbackId = countlyCommon.ACTIVE_APP_ID;
        if (manageIndex !== -1) {
            feedbackId = segments[manageIndex + 1];
        }
        app.addAppManagementInput("feedbackApp", CV.i18n("feedback.title"),
            {
                "feedbackApp.main_color": {input: "cly-colorpicker", attrs: {resetValue: '#2FA732'}, defaultValue: ""},
                "feedbackApp.font_color": {input: "cly-colorpicker", attrs: {resetValue: '#2FA732'}, defaultValue: ""},
                "feedbackApp.feedback_logo": {
                    input: "image",
                    helper: "feedback.logo.description",
                    image_size: "feedback_logo" + feedbackId,
                    attrs: {
                        action: countlyGlobal.path + "/i/feedback/upload",
                    },
                    errorMessage: "",
                    success: function() {
                        app.configurationsView.predefinedInputs["feedback.feedback_logo"].errorMessage = "";
                        if (this.$root && this.$root.$children) {
                            for (var i = 0; i < this.$root.$children.length; i++) {
                                if (this.$root.$children[i].appDetails) {
                                    this.$root.$children[i].onChange("feedbackApp.feedback_logo", "feedback_logo" + feedbackId);
                                    break;
                                }
                            }
                        }
                    },
                    error: function(err) {
                        var message = jQuery.i18n.map["feedback.error"];
                        if (err && err.message) {
                            try {
                                var parts = JSON.parse(err.message);
                                var m = parts.message || parts.error || parts.result;
                                message = jQuery.i18n.map[m] || m;
                            }
                            catch (ex) {
                                message = jQuery.i18n.map["feedback.error"];
                            }
                        }
                        app.configurationsView.predefinedInputs["feedback.feedback_logo" + feedbackId].errorMessage = message;
                    },
                    before: function(file) {
                        segments = window.location.href.split('/');
                        manageIndex = segments.indexOf('apps');
                        feedbackId = segments[manageIndex + 1] || countlyCommon.ACTIVE_APP_ID;
                        var type = file.type;
                        if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
                            app.configurationsView.predefinedInputs["feedback.feedback_logo" + feedbackId].errorMessage = jQuery.i18n.map["feedback.imagef-error"];
                            return false;
                        }
                        if (file.size > 1.5 * 1024 * 1024) {
                            app.configurationsView.predefinedInputs["feedback.feedback_logo" + feedbackId].errorMessage = jQuery.i18n.map["feedback.image-error"];
                            return false;
                        }
                        return true;
                    }
                }
            });
    }

    app.addMenu("reach", {code: "feedback", permission: FEATURE_NAME, text: "sidebar.feedback", icon: '<div class="logo ion-android-star-half"></div>', priority: 20});
    app.addSubMenu("feedback", {
        code: "star-rating",
        permission: FEATURE_NAME,
        pluginName: "star-rating",
        url: "#/feedback/ratings",
        text: "star.menu-title",
        icon: '<div class="logo ion-android-star-half"></div>',
        priority: 30
    });

    countlyVue.container.registerMixin("/manage/export/export-features", {
        pluginName: "star-rating",
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
})();
