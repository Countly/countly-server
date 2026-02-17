<template>
<div class="guide-dialog-wrapper">
    <div v-if="isButtonVisible" data-test-id="view-guide-button" :class="dynamicClassGuideButton" @click="onClick">
        <span class="icon">
            <img :src="'images/icons/book-open.svg'" alt="Icon"/>
        </span>
        <span class="text"> {{ i18n('guides.view') }} </span>
    </div>

    <cly-tooltip-icon
        v-else-if="tooltip && tooltip.description"
        :data-test-id="`${testId}-tooltip`"
        :tooltip="tooltip.description"
        icon="ion ion-help-circled"
        :placement="tooltip.placement">
    </cly-tooltip-icon>

    <el-dialog
        :visible.sync="isDialogVisible"
        custom-class="guide-dialog"
        :modal="false"
        :lock-scroll="true"
        :show-close="false"
    >
        <template v-slot:title>
            <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center">
                <h2>{{ guideData.sectionTitle || "" }}</h2>
                <div class="close-icon" @click="onClose">
                    <img class="bu-p-1" :src="'images/icons/close-icon-grey.svg'" alt="Icon"/>
                </div>
            </div>
        </template>
        <div class="content">
            <vue-scroll :ops="scrollDialogContent">
                <div v-if="guideData.sectionDescription" class="description">
                    {{ guideData.sectionDescription }}
                </div>
                <div v-if="guideData.walkthroughs && guideData.walkthroughs.length > 0" class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-start" style="margin-bottom: 25px;">
                    <div class="title">{{ guideData.walkthroughTitle || guideConfig.walkthroughTitle }}</div>
                    <div class="description">{{ guideData.walkthroughDescription || guideConfig.walkthroughDescription }}</div>
                    <div style="width:100%;">
                        <vue-scroll ref="walkthroughSlider" :ops="scrollWalkthroughs" style="width:100%;">
                            <div class="bu-is-flex">
                                <walkthrough-component
                                    v-for="(walkthrough, index) in guideData.walkthroughs"
                                    :value="guideData.walkthroughs[index]"
                                    :key="guideData.walkthroughs[index].id"
                                    style="max-width:25%;"
                                    :index="index"
                                >
                                </walkthrough-component>
                            </div>
                        </vue-scroll>
                    </div>
                </div>
                <div v-if="guideData.articles && guideData.articles.length > 0" class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-start">
                    <div class="title">{{ guideData.articleTitle || guideConfig.articleTitle }}</div>
                    <div class="description">{{ guideData.articleDescription || guideConfig.articleDescription }}</div>
                    <div class="bu-is-flex bu-is-flex-wrap-wrap" style="width: 100%;">
                        <article-component
                            v-for="(article, index) in guideData.articles"
                            :value="guideData.articles[index]"
                            :index="index"
                            :key="guideData.articles[index].id"
                            :class="{'bu-is-one-third': true, 'border-box': true}"
                        >
                        </article-component>
                    </div>
                </div>
            </vue-scroll>
        </div>
        <template v-slot:footer>
            <div class="bu-is-flex bu-is-justify-content-space-between">
                <div class="feedback__link" @click="fetchAndDisplayWidget">
                    {{ i18n('guides.feedback') }}
                </div>
                <a class="link" href="https://support.count.ly" target="_blank">
                    <span>{{ i18n('guides.help-center') }}</span>
                    <i class="ion-android-open bu-ml-1"></i>
                </a>
            </div>
        </template>
    </el-dialog>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import countlyCMS from '../../../../../frontend/express/public/javascripts/countly/countly.cms.js';
import countlyGuides from '../store/index.js';
import ArticleComponent from './ArticleComponent.vue';
import WalkthroughComponent from './WalkthroughComponent.vue';
import Countly from "countly-sdk-web";

export default {
    mixins: [i18nMixin],
    components: {
        'article-component': ArticleComponent,
        'walkthrough-component': WalkthroughComponent
    },
    props: {
        tooltip: {
            type: Object,
            default: function() {
                return {
                    description: "",
                    placement: "bottom-end"
                };
            }
        },
        testId: {
            type: String,
            default: "view-guide-test-id"
        }
    },
    data: function() {
        return {
            isButtonVisible: false,
            isDialogVisible: false,
            guideData: {},
            guideConfig: {},
            scrollWalkthroughs: {
                vuescroll: {
                    sizeStrategy: 'number'
                },
                scrollPanel: {
                    initialScrollX: false,
                    keepShow: false,
                    scrollingY: false,
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: false
                }
            },
            scrollDialogContent: {
                scrollPanel: {
                    scrollingX: false,
                    keepShow: false,
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: false,
                }
            },
            viewedGuides: countlyGlobal.member.viewedGuides,
        };
    },
    created: function() {
        var self = this;
        let sections = this.filterSections(window.location.hash.split('/'));
        while (sections.length > 0 && !self.isButtonVisible) {
            let sectionID = '/' + sections.join('/');
            countlyGuides.fetchEntries({ sectionID: sectionID }).then(function() {
                let entry = countlyGuides.getEntry(sectionID);
                if (entry && (entry.walkthroughs.length > 0 || entry.articles.length > 0)) {
                    self.isButtonVisible = true;
                    self.guideData = entry;
                    countlyCMS.fetchEntry("server-guide-config").then(function(config) {
                        self.guideConfig = (config && config.data && config.data[0] && config.data[0]) || {};
                    });
                }
            });
            sections.pop();
        }
    },
    mounted: function() {
        document.addEventListener('keydown', this.handleEscapeKey);
    },
    beforeDestroy: function() {
        document.removeEventListener('keydown', this.handleEscapeKey);
    },
    computed: {
        dynamicClassGuideButton: function() {
            var highlightGuidesButton = true;
            if (this.viewedGuides === true) {
                highlightGuidesButton = false;
            }
            if (this.isDialogVisible) {
                highlightGuidesButton = true;
            }
            return highlightGuidesButton ? 'view-button-initial' : 'view-button';
        }
    },
    methods: {
        onClick: function() {
            this.isDialogVisible = true;
            var mainViewContainer = document.getElementById('main-views-container');
            mainViewContainer.getElementsByClassName('main-view')[0].style.setProperty('overflow', 'hidden', 'important');

            if (this.viewedGuides !== true) {
                countlyGuides.memberViewedGuides(countlyGlobal.member._id);
                this.viewedGuides = countlyGlobal.member.viewedGuides = true;
            }
        },
        onClose: function() {
            this.isDialogVisible = false;
            var mainViewContainer = document.getElementById('main-views-container');
            mainViewContainer.getElementsByClassName('main-view')[0].style.setProperty('overflow', 'auto', 'important');
        },
        filterSections: function(sections) {
            for (var i = 0; i < sections.length; i++) {
                if (sections[i] === countlyCommon.ACTIVE_APP_ID) {
                    sections.splice(i, 1);
                    i--;
                }
                else if (sections[i] === '#') {
                    sections.splice(i, 1);
                    i--;
                }
            }
            return sections;
        },
        fetchAndDisplayWidget: function() {
            var domain = countlyGlobal.countly_domain;
            var self = this;
            try {
                var urlObj = new URL(domain);
                domain = urlObj.hostname;
            }
            catch (_) {
                // do nothing
            }
            var COUNTLY_STATS = Countly.init({
                app_key: "e70ec21cbe19e799472dfaee0adb9223516d238f",
                url: "https://stats.count.ly",
                device_id: domain
            });
            COUNTLY_STATS.get_available_feedback_widgets(function(countlyPresentableFeedback, err) {
                if (err) {
                    return;
                }
                var widgetType = "survey";
                var countlyFeedbackWidget = countlyPresentableFeedback.find(function(widget) {
                    return widget.type === widgetType;
                });
                if (!countlyFeedbackWidget) {
                    return;
                }
                var selectorId = "feedback-survey";
                var segmentation = { guide: self.guideData.sectionID || "" };
                COUNTLY_STATS.present_feedback_widget(countlyFeedbackWidget, selectorId, null, segmentation);
            });
        },
        handleEscapeKey: function(event) {
            if (event.keyCode === 27 || event.key === 'Escape') {
                this.onClose();
            }
        },
    },
};
</script>
