<template>
    <el-card class="box-card cly-vue-push-notification-details-summary-card">
        <template v-if="pushNotification.messageType === MessageTypeEnum.CONTENT">
            <div slot="header" class="clearfix">
                <span class="bu-mr-1 color-cool-gray-50 font-weight-bold text-small">{{i18n('push-notification-details.localization-filter-label')}}</span>
                <el-select v-model="selectedMessageLocale">
                    <el-option v-for="item in localizations" :key="item.value" :value="item.value" :label="item.label">
                    </el-option>
                </el-select>
            </div>
            <div class="bu-p-1">
                <div class="bu-level bu-mb-4 bu-is-justify-content-flex-start bu-is-align-items-flex-start">
                    <div class="bu-is-flex-grow-0 bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__label">
                        {{i18n('push-notification-details.message-title')}}
                    </div>
                    <div class="bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__value">
                        <template v-if="previewMessageTitle.length">
                            <template v-for="(component) in previewMessageTitle">
                                <keep-alive>
                                    <component v-bind:is="component.name" :value="component.value"></component>
                                </keep-alive>
                            </template>
                        </template>
                        <template v-else>
                            <span>-</span>
                        </template>
                    </div>
                </div>
                <div v-if="selectedMobileMessagePlatform === PlatformEnum.IOS && subtitle" class="bu-level bu-mb-4 bu-is-justify-content-flex-start bu-is-align-items-flex-start">
                    <div class="bu-is-flex-grow-0 bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__label">
                        {{i18n('push-notification.subtitle')}}
                    </div>
                    <div class="bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__value">
                        <span>{{subtitle}}</span>
                    </div>
                </div>
                <div class="bu-level bu-mb-4 bu-is-justify-content-flex-start bu-is-align-items-flex-start">
                    <div class="bu-is-flex-grow-0 bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__label">
                        {{i18n('push-notification-details.message-content')}}
                    </div>
                    <div class="bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__value">
                        <template v-if="previewMessageContent.length">
                            <template v-for="(component) in previewMessageContent">
                                <keep-alive>
                                    <component v-bind:is="component.name" :value="component.value"></component>
                                </keep-alive>
                            </template>
                        </template>
                        <template v-else>
                            <span>-</span>
                        </template>
                    </div>
                </div>
                <template v-if="message.buttons && message.buttons.length>0">
                    <template v-for="(button,index) in message.buttons">
                        <details-tab-row :label="index === 0?i18n('push-notification-details.message-first-button-label'):i18n('push-notification-details.message-second-button-label')" :value="button.label"></details-tab-row>
                        <details-tab-row :label="index === 0?i18n('push-notification-details.message-first-button-url'):i18n('push-notification-details.message-second-button-url')" :value="button.url"></details-tab-row>
                    </template>
                </template>
                <details-tab-row v-if="hasAllPlatformMediaOnly" :label="i18n('push-notification-details.message-media-url')" :value="this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL || '-'"> </details-tab-row>
                <template v-else>
                    <div v-for="platform in platformsForSummary">
                        <div class="bu-py-4 text-big font-weight-bold bu-is-capitalized"> {{i18n('push-notification-details-platform-settings', platform)}} </div>
                        <details-tab-row v-if="pushNotification.settings[platform].subtitle" :label="i18n('push-notification.subtitle')" :value="pushNotification.settings[platform].subtitle"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].mediaURL" :label="i18n('push-notification-details.message-media-url')" :value="pushNotification.settings[platform].mediaURL"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].mediaMime" :label="i18n('push-notification-details.message-media-mime')" :value="pushNotification.settings[platform].mediaMime"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].soundFilename" :label="i18n('push-notification.sound-file-name')" :value="pushNotification.settings[platform].soundFilename"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].badgeNumber" :label="i18n('push-notification.badge-number')" :value="pushNotification.settings[platform].badgeNumber"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].onClickURL" :label="i18n('push-notification.on-click-url')" :value="pushNotification.settings[platform].onClickURL"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].json" :label="i18n('push-notification.json-data')" :value="pushNotification.settings[platform].json"></details-tab-row>
                        <details-tab-row v-if="pushNotification.settings[platform].userData && pushNotification.settings[platform].userData.length" :label="i18n('push-notification.user-data')" :value="pushNotification.settings[platform].userData.join(', ')"></details-tab-row>
                    </div>
                </template>
            </div>
        </template>
        <template v-if="pushNotification.messageType === MessageTypeEnum.SILENT">
            <div>
                <details-tab-row :label="i18n('push-notification.ios-badge-number-setting')" :value="pushNotification.settings[PlatformEnum.IOS].badgeNumber"> </details-tab-row>
                <details-tab-row :label="i18n('push-notification.ios-json-data-setting')" :value="prettifyJSON(pushNotification.settings[PlatformEnum.IOS].json)"  :usePre="true"> </details-tab-row>
                <details-tab-row :label="i18n('push-notification.ios-user-data-setting')" :value="pushNotification.settings[PlatformEnum.IOS].userData.join(', ')"> </details-tab-row>
                <details-tab-row :label="i18n('push-notification.android-badge-number-setting')" :value="pushNotification.settings[PlatformEnum.ANDROID].badgeNumber"> </details-tab-row>
                <details-tab-row :label="i18n('push-notification.android-json-data-setting')" :value="prettifyJSON(pushNotification.settings[PlatformEnum.ANDROID].json)"  :usePre="true"> </details-tab-row>
                <details-tab-row :label="i18n('push-notification.android-user-data-setting')" :value="pushNotification.settings[PlatformEnum.ANDROID].userData.join(', ')"> </details-tab-row>
            </div>
        </template>
    </el-card>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyPushNotification from '../../store/index.js';
import UserPropertyPreview from './UserPropertyPreview.vue';
import UserPropertyTextPreview from './UserPropertyTextPreview.vue';
import DetailsTabRow from './DetailsTabRow.vue';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            PlatformEnum: countlyPushNotification.service.PlatformEnum,
            MessageTypeEnum: countlyPushNotification.service.MessageTypeEnum,
            platformsForSummary: ["ios", "android"]
        };
    },
    computed: {
        pushNotification: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification;
        },
        selectedMessageLocale: {
            get: function() {
                return this.$store.state.countlyPushNotificationDetails.messageLocaleFilter;
            },
            set: function(value) {
                this.$store.dispatch("countlyPushNotificationDetails/onSetMessageLocaleFilter", value);
            }
        },
        message: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification.message[this.selectedMessageLocale];
        },
        localizations: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification.localizations;
        },
        previewMessageTitle: function() {
            if (this.message.title) {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.message.title);
            }
            return "";
        },
        previewMessageContent: function() {
            if (this.message.content) {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.message.content);
            }
            return "";
        },
        previewAndroidMedia: function() {
            var result = "-";
            if (this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL) {
                result = this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL;
            }
            if (this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL) {
                result = this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL;
            }
            return result;
        },
        previewIOSMedia: function() {
            var result = "-";
            if (this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL) {
                result = this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL;
            }
            if (this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL) {
                result = this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL;
            }
            return result;
        },
        hasAllPlatformMediaOnly: function() {
            return !this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL && !this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL;
        },
        subtitle: function() {
            return this.pushNotification.settings[this.PlatformEnum.IOS].subtitle;
        },
        selectedMobileMessagePlatform: function() {
            return this.$store.state.countlyPushNotificationDetails.mobileMessagePlatform;
        }
    },
    methods: {
        prettifyJSON: function(value) {
            return countlyPushNotification.helper.prettifyJSON(value, 2);
        }
    },
    components: {
        'user-property-preview': UserPropertyPreview,
        'user-property-text-preview': UserPropertyTextPreview,
        'details-tab-row': DetailsTabRow
    }
};
</script>
