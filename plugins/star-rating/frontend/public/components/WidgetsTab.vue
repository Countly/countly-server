<template>
    <div class="ratings-tab-view">
        <cly-header v-if="!loading">
            <template v-slot:header-left>
                <h2 data-test-id="ratings-widgets-header-title">{{ i18n('feedback.widgets') }}</h2>
                &nbsp; <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
            </template>
            <template v-slot:header-right>
                <div class="bu-level-item">
                    <el-button v-if="canUserCreate" data-test-id="ratings-widgets-add-button" class="manage-users-action-btn" @click="createWidget()" type="success" size="small" icon="el-icon-circle-plus"> {{ i18n('feedback.add-new-widget') }}
                    </el-button>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <widgets-table
                v-if="!isEmptyTable"
                :rows="widgets"
                @widgets-updated="refresh()"
            />
            <drawer @widgets-refresh="refresh()" :settings="drawerSettings" :controls="drawers.widget"></drawer>
            <cly-empty-view test-id="ratings-widgets" v-if="widgets.length===0 && !loading" :title="empty.title"
                :subTitle="empty.body"
                :actionTitle="i18n('feedback.add-new-widget')"
                :hasAction="canUserCreate">
                <div slot="icon" class="bu-mt-6">
                    <img data-test-id="ratings-widgets-empty-view-icon" width="96" height="96" :src="empty.image"/>
                </div>
                <div slot="action" v-if="canUserCreate">
                    <div data-test-id="ratings-widgets-empty-view-action-button" @click="createWidget()" class="bu-is-clickable button bu-has-text-centered color-blue-100 pointer">+ {{i18n('feedback.add-new-widget')}}</div>
                </div>
            </cly-empty-view>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import starRatingPlugin from '../store/index.js';
import WidgetsTable from './WidgetsTable.vue';
import Drawer from './Drawer.vue';

var FEATURE_NAME = 'star_rating';

export default {
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.mixins.hasDrawers("widget"),
        countlyVue.mixins.auth(FEATURE_NAME)
    ],
    components: {
        'widgets-table': WidgetsTable,
        'drawer': Drawer
    },
    data: function() {
        return {
            empty: {
                title: i18n("ratings.empty.title"),
                body: i18n("ratings.empty.body"),
                image: "/star-rating/images/star-rating/ratings-empty.svg"
            },
            widgets: [],
            drawerSettings: {
                createTitle: i18n('feedback.add-widget'),
                editTitle: i18n('feedback.edit-widget'),
                saveButtonLabel: i18n('common.save'),
                createButtonLabel: i18n('common.create'),
                isEditMode: false
            },
            widget: '',
            rating: {},
            loading: true
        };
    },
    computed: {
        isEmptyTable: function() {
            return !this.loading && !this.widgets?.length;
        }
    },
    methods: {
        createWidget: function() {
            var trigger_bg_color = '#123456';
            var trigger_font_color = '#fff';
            var logoType = 'default';
            var logo = null;
            var globalLogo = false;
            if ((countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.feedbackApp) || window.countlyPlugins.getConfigsData().feedback) {
                var feedbackApp = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.feedbackApp ? countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.feedbackApp : null;
                var feedback = window.countlyPlugins.getConfigsData().feedback;
                if (feedbackApp && feedbackApp.main_color) {
                    trigger_bg_color = feedbackApp.main_color;
                }
                else if (window.countlyPlugins.getConfigsData().feedback) {
                    trigger_bg_color = feedback.main_color;
                }
                if (feedbackApp && feedbackApp.font_color) {
                    trigger_font_color = feedbackApp.font_color;
                }
                else if (window.countlyPlugins.getConfigsData().feedback) {
                    trigger_font_color = feedback.font_color;
                }
                if (feedbackApp && feedbackApp.feedback_logo) {
                    logo = '/feedback/preview/' + feedbackApp.feedback_logo;
                    logoType = 'custom';
                    globalLogo = true;
                }
                else if (window.countlyPlugins.getConfigsData().feedback && window.countlyPlugins.getConfigsData().feedback.feedback_logo) {
                    logo = '/feedback/preview/' + feedback.feedback_logo;
                    logoType = 'custom';
                    globalLogo = true;
                }
            }
            this.openDrawer("widget", {
                consent: false,
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
                internalName: ''
            });
        },
        refresh: function(force) {
            this.fetch(force);
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
                    self.platform_version = starRatingPlugin.getPlatformVersion();
                    self.rating = starRatingPlugin.getRatingInPeriod();
                    self.widgets = starRatingPlugin.getFeedbackWidgetsData();
                    self.loading = false;
                });
        }
    },
    created: function() {
        this.fetch(true);
    }
};
</script>
