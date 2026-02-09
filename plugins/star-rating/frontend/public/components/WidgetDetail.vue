<template>
    <div class="ratings-widget-detail-view">
        <cly-header>
            <template v-slot:header-left>
                <div class="ratings-widget-detail-view__widget-information">
                    <div @click="backToWidgets()" class="ratings-widget-detail-view__back-link bu-is-size-7">
                        <i data-test-id="ratings-detail-back-link-icon" class="el-icon-back"></i>
                        <span data-test-id="ratings-detail-back-link-label">{{ i18n('feedback.back-to-rating-widgets') }}</span>
                    </div>
                    <div class="ratings-widget-detail-view__widget-name">
                        <h3 class="ratings-widget-detail-view__widget-name" data-test-id="ratings-detail-widget-name-label">{{unescapeHtml(widget.popup_header_text)}}</h3>
                    </div>
                    <div class="ratings-widget-detail-view__widget-informations bu-mt-4">
                        <cly-status-tag
                            data-test-id="ratings-detail-widget-status"
                            :color="statusColor"
                            :loading="isLoading"
                            :text="statusText"
                        />
                        <div class="ratings-widget-detail-view__created-at text-medium bu-p-1 bu-ml-2">
                            <i class="ion-android-time" data-test-id="ratings-detail-created-at-icon"></i>
                            <span data-test-id="ratings-detail-created-at-label">{{ i18n('feedback.created-at') }}</span>
                            <span data-test-id="ratings-detail-created-at-value">{{unescapeHtml(widget.created_at)}}</span>
                        </div>
                        <div class="ratings-widget-detail-view__widget-id text-medium bu-p-1 bu-ml-2">
                            <i data-test-id="ratings-detail-price-tag-icon" class="ion-pricetag"></i>
                            <span data-test-id="ratings-detail-widget-id-label" class="ratings-widget-detail-view__widget-id">{{ i18n('feedback.widget-id') }} </span>
                            <span data-test-id="ratings-detail-widget-id-value" class="ratings-widget-detail-view__ID">{{ widget._id }}</span>
                        </div>
                    </div>
                </div>
            </template>
            <template v-slot:header-right>
                <div class="bu-mt-2">
                    <el-button data-test-id="ratings-detail-stop-widget-button" v-if="widget.status && canUserUpdate" @click="setWidget(false)" size="small" icon="ion-android-cancel"> {{ i18n('feedback.stop-widget') }}
                    </el-button>
                    <el-button data-test-id="ratings-detail-start-widget-button" v-if="!widget.status && canUserUpdate" @click="setWidget(true)" size="small" icon="ion-android-arrow-dropright-circle"> {{ i18n('feedback.start-widget') }}
                    </el-button>
                    <el-button data-test-id="ratings-detail-edit-widget-button" v-if="canUserUpdate" @click="editWidget()" class="ratings-widget-detail-view__edit-widget" size="small" icon="ion-edit"> {{ i18n('feedback.edit-widget') }}
                    </el-button>
                    <cly-more-options test-id="ratings-detail" v-if="canUserDelete" class="bu-ml-2" size="small" @command="handleCommand($event)">
                        <el-dropdown-item data-test-id="ratings-detail" command="delete-widget"> {{ i18n('feedback.delete-widget') }} </el-dropdown-item>
                    </cly-more-options>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <el-collapse class="ratings-widget-detail-view__targeting is-bordered-box" v-if="cohortsEnabled" :icon="{ position: 'left', direction: 'right'}" v-model="activeNames">
                <el-collapse-item test-id="ratings-detail-collapse-item" :title="i18n('feedback.targeting')" name="1">
                    <cly-cohort-targeting test-id="ratings-detail" :targeting="widget.targeting">
                    </cly-cohort-targeting>
                </el-collapse-item>
            </el-collapse>
            <div class="bu-level ratings-widget-detail-view__filter-level">
                <div class="bu-level-left">
                    <div class="bu-level-item">
                        <span data-test-id="ratings-detail-results-for-label">{{ i18n('feedback.results-for') }}</span>
                        <cly-multi-select test-id="ratings-detail" class="bu-ml-3 ratings-tab-view__filter-selector" @change="refresh" @updated="prepareVersions" v-model="activeFilter" :fields="activeFilterFields"></cly-multi-select>
                    </div>
                </div>
                <div class="bu-level-right">
                    <div class="bu-level-item">
                        <cly-date-picker-g test-id="ratings-detail"></cly-date-picker-g>
                    </div>
                </div>
            </div>
            <cly-section>
                <cly-metric-cards class="ratings-widget-detail-view__cards bu-has-background-white">
                    <cly-metric-card test-id="ratings-detail-metric-card-widget-detail-ratings" :number="count" :tooltip="i18n('ratings.tooltip.widget-detail-ratings')">
                        <span data-test-id="ratings-detail-metric-card-widget-detail-ratings-label" class="ratings-section-title">{{ i18n('feedback.ratings') }}</span><cly-tooltip-icon data-test-id="ratings-detail-metric-card-widget-detail-ratings-tooltip" icon="ion-help-circled"></cly-tooltip-icon>
                    </cly-metric-card>
                    <cly-metric-card test-id="ratings-detail-metric-card-widget-detail-rate" :number="ratingRate" :is-percentage="true" :tooltip="i18n('ratings.tooltip.widget-detail-rate')">
                        <span data-test-id="ratings-detail-metric-card-widget-detail-rate-label" class="ratings-section-title">{{ i18n('feedback.ratings-rate') }}</span><cly-tooltip-icon data-test-id="ratings-detail-metric-card-widget-detail-rate-tooltip" icon="ion-help-circled"></cly-tooltip-icon>
                    </cly-metric-card>
                    <cly-metric-card test-id="ratings-detail-metric-card-widget-detail-times-shown" :number="widget.timesShown" :tooltip="i18n('ratings.tooltip.widget-detail-times-shown')">
                        <span data-test-id="ratings-detail-metric-card-widget-detail-times-shown-label" class="ratings-section-title">{{ i18n('feedback.times-shown') }}</span><cly-tooltip-icon data-test-id="ratings-detail-metric-card-widget-detail-times-shown-tooltip" icon="ion-help-circled"></cly-tooltip-icon>
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <cly-section>
                <cly-chart-bar test-id="ratings-detail-chart" v-loading="isLoading" :force-loading="isLoading" class="ratings-wrapper__bar-chart bu-has-background-white" :option="barOptions"></cly-chart-bar>
            </cly-section>
            <cly-dynamic-tabs :comments="feedbackData.aaData" :ratings="cumulativeData" :loadingState="isLoading" :filter="activeFilter" skin="secondary" v-model="dynamicTab" :tabs="tabs">
                <template v-slot:tables="scope">
                    <span>{{scope.tab.title}}</span>
                </template>
            </cly-dynamic-tabs>
        </cly-main>
        <drawer @widgets-refresh="refresh()" :settings="drawerSettings" :controls="drawers.widget"></drawer>
    </div>
</template>

<script>
import countlyVue, { i18n, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import starRatingPlugin from '../store/index.js';
import RatingsTable from './RatingsTable.vue';
import CommentsTable from './CommentsTable.vue';
import Drawer from './Drawer.vue';

var FEATURE_NAME = 'star_rating';
var CLY_X_INT = 'cly_x_int';

function replaceEscapes(str) {
    if (typeof str === 'string') {
        return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }
    return str;
}

export default {
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.mixins.hasDrawers("widget"),
        countlyVue.mixins.auth(FEATURE_NAME),
        countlyVue.mixins.commonFormatters,
        autoRefreshMixin
    ],
    components: {
        'drawer': Drawer
    },
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
                        name: i18n('feedback.ratings'),
                        data: [0, 0, 0, 0, 0]
                    }
                ]
            },
            tabs: [
                {
                    title: i18n('feedback.ratings'),
                    name: 'ratings-table',
                    component: RatingsTable,
                    dataTestId: "ratings-detail-table-tab-ratings"
                },
                {
                    title: i18n('feedback.comments'),
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
                createTitle: i18n('feedback.add-widget'),
                editTitle: i18n('feedback.edit-widget'),
                saveButtonLabel: i18n('common.save'),
                createButtonLabel: i18n('common.create'),
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
            self.count = 0;
            self.avg = 0;
            self.sum = 0;
            self.cumulativeData = [
                { count: 0, percent: 0, rating: 0 },
                { count: 0, percent: 0, rating: 1 },
                { count: 0, percent: 0, rating: 2 },
                { count: 0, percent: 0, rating: 3 },
                { count: 0, percent: 0, rating: 4 }
            ];

            var ratingArray = [];
            var result = self.rating;
            var periodArray = countlyCommon.getPeriodObj().currentPeriodArr;

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

            self.barOptions.series[0].data = [];
            self.cumulativeData.forEach(function(star) {
                self.barOptions.series[0].data.push(star.count);
            });

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
                    message: i18n('feedback.successfully-updated')
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

            if (this.widget.consent === true || this.widget.consent === "true") {
                this.widget.consent = true;
            }
            else {
                this.widget.consent = false;
            }

            if (Array.isArray(this.widget.links) && this.widget.links.length) {
                this.widget.links.forEach(function(link) {
                    if (link.linkValue.indexOf('term')) {
                        link.text = "Terms and Conditions";
                        link.link = "https://termsandconditions.com";
                    }
                    else if (link.linkValue.indexOf('text')) {
                        link.text = "Privacy Policy";
                        link.link = "https://privacyPolicy.com";
                    }
                    else {
                        link.text = "Another Link";
                        link.link = "https://otherlink.com";
                    }
                    link.linkValue = link.linkValue.replace(new RegExp('[?&]' + CLY_X_INT + '=[^&]*'), '').replace(/[?&]$/, '');
                });
                this.widget.links = {"link": this.widget.links, "finalText": this.widget.finalText};
            }
            else {
                this.widget.links = {
                    "link": [
                        {
                            "text": "Terms and Conditions",
                            "link": "https://termsandconditions.com",
                            "textValue": "Terms and Conditions",
                            "linkValue": "https://termsandconditions.com"
                        },
                        {
                            "text": "Privacy Policy",
                            "link": "https://privacyPolicy.com",
                            "textValue": "Privacy Policy",
                            "linkValue": "https://privacyPolicy.com"
                        }
                    ],
                    "finalText": "I agree to the Terms and Conditions and Privacy Policy."
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
                CountlyHelpers.confirm(i18n('feedback.delete-a-widget-description'), "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    starRatingPlugin.removeFeedbackWidget(self.widget._id, false, function() {
                        CountlyHelpers.notify({
                            type: 'success',
                            message: i18n('feedback.successfully-removed')
                        });
                        window.location.hash = "#/" + countlyCommon.ACTIVE_APP_ID + "/feedback/ratings/widgets";
                    });
                }, [], { image: 'delete-an-app', title: i18n('feedback.delete-a-widget') }, "ratings-detail");
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
                regexString += '(.*)(\\*\\*)[1-5]';
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
        dateChanged: function() {
            this.fetch(true);
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
            this.activeFilter.widget = this.widget._id || this.$route.params.id;
            if (force) {
                this.isLoading = true;
            }
            $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod())
                .then(function() {
                    self.isLoading = false;
                    self.platform_version = starRatingPlugin.getPlatformVersion();
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
        },
        statusColor: function() {
            return this.widget.status ? 'green' : 'red';
        },
        statusText: function() {
            return i18n('feedback.' + (this.widget.status ? 'active' : 'disabled'));
        }
    },
    mounted: function() {
        this.fetch(true);
    }
};
</script>
