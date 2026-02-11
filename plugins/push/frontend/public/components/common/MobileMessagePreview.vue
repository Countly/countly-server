<template>
    <div class="cly-vue-push-notification-mobile-preview">
        <div class="cly-vue-push-notification-mobile-preview__images">
            <img v-if="isIOSPlatformSelected" src="../../assets/images/preview.i.png" />
            <img v-else-if="isAndroidPlatformSelected" src="../../assets/images/preview.a.png" />
        </div>

        <div v-if="isIOSPlatformSelected" class="cly-vue-push-notification-mobile-preview__ios-message">
            <div class="cly-vue-push-notification-mobile-preview__ios-header">
                <img class="cly-vue-push-notification-mobile-preview__ios-header-image" :src="'/appimages/5ea4bd674bb4a33298a81727.png'" />
                <span class="cly-vue-push-notification-mobile-preview__ios-header-app-name">
                    {{appName}}
                </span>
                <span class="cly-vue-push-notification-mobile-preview__ios-header-close-button">
                    X
                </span>
            </div>
            <template v-if="isVideo(mediaPreview[PlatformEnum.IOS].type)">
                <video v-bind:src="mediaPreview[PlatformEnum.IOS].url" class="cly-vue-push-notification-mobile-preview__ios-media" controls> </video>
            </template>
            <template v-else>
                <img v-if="mediaPreview[PlatformEnum.IOS].url || mediaPreview[PlatformEnum.ALL].url" class="cly-vue-push-notification-mobile-preview__ios-media" v-bind:src="mediaPreview[PlatformEnum.IOS].url || mediaPreview[PlatformEnum.ALL].url" />
            </template>
            <div class="cly-vue-push-notification-mobile-preview__ios-title">
                <template v-for="(component) in titlePreviewComponentsList">
                    <keep-alive>
                        <component v-bind:is="component.name" :value="component.value"></component>
                    </keep-alive>
                </template>
            </div>
            <div class="cly-vue-push-notification-mobile-preview__ios-title">
                <span> {{subtitle}}  </span>
            </div>
            <div class="cly-vue-push-notification-mobile-preview__ios-content">
                <template v-for="(component) in contentPreviewComponentsList">
                    <keep-alive>
                        <component v-bind:is="component.name" :value="component.value"></component>
                    </keep-alive>
                </template>
            </div>
            <div class="cly-vue-push-notification-mobile-preview__ios-buttons-list">
                <div v-for="button in buttons" class="cly-vue-push-notification-mobile-preview__ios-button">{{button}}</div>
            </div>
        </div>
        <div v-else-if="isAndroidPlatformSelected" class="cly-vue-push-notification-mobile-preview__android-message">
            <div class="cly-vue-push-notification-mobile-preview__android-header">
                <img class="cly-vue-push-notification-mobile-preview__android-header-image" :src="'/appimages/5ea4bd674bb4a33298a81727.png'" />
                <span class="cly-vue-push-notification-mobile-preview__android-header-app-name">
                    {{appName}}
                </span>
                <span class="cly-vue-push-notification-mobile-preview__android-header-time">
                    {{timeNow()}}
                </span>
            </div>
            <div class="cly-vue-push-notification-mobile-preview__android-title">
                <template v-for="(component) in titlePreviewComponentsList">
                    <keep-alive>
                        <component v-bind:is="component.name" :value="component.value"></component>
                    </keep-alive>
                </template>
            </div>
            <div class="cly-vue-push-notification-mobile-preview__android-content">
                <template v-for="(component) in contentPreviewComponentsList">
                    <keep-alive>
                        <component v-bind:is="component.name" :value="component.value"></component>
                    </keep-alive>
                </template>
            </div>
            <div class="cly-vue-push-notification-mobile-preview__android-buttons-list">
                <div v-for="button in buttons" class="cly-vue-push-notification-mobile-preview__android-button">{{button}}</div>
            </div>
            <img v-if="mediaPreview[PlatformEnum.ANDROID].url || mediaPreview[PlatformEnum.ALL].url" v-bind:src="mediaPreview[PlatformEnum.ANDROID].url||mediaPreview[PlatformEnum.ALL].url" class="cly-vue-push-notification-mobile-preview__android-media" />
        </div>

        <div class="cly-vue-push-notification-mobile-preview__platforms">
            <el-radio-group v-model="selectedPlatform" @change="onPlatformChange">
                <el-radio-button v-if="hasAndroidPlatform" :key="PlatformEnum.ANDROID" :label="PlatformEnum.ANDROID">{{i18n('push-notification.android')}}</el-radio-button>
                <el-radio-button v-if="hasIOSPlatform" :key="PlatformEnum.IOS" :label="PlatformEnum.IOS">{{i18n('push-notification.ios')}}</el-radio-button>
            </el-radio-group>
        </div>
    </div>
</template>

<script>
import moment from 'moment';
import { i18n, i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyPushNotification from '../../store/index.js';
import countlyGlobal from '../../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import UserPropertyPreview from './UserPropertyPreview.vue';
import UserPropertyTextPreview from './UserPropertyTextPreview.vue';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            selectedPlatform: this.findInitialSelectedPlatform(),
            PlatformEnum: countlyPushNotification.service.PlatformEnum,
            appName: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name || i18n('push-notification.mobile-preview-default-app-name'),
            videoRegex: new RegExp('video/*'),
        };
    },
    props: {
        platforms: {
            type: Array,
            default: function() {
                return [];
            }
        },
        title: {
            type: String,
            default: function() {
                return i18n('push-notification.mobile-preview-default-title');
            }
        },
        subtitle: {
            type: String,
            default: ""
        },
        content: {
            type: String,
            default: function() {
                return i18n('push-notification.mobile-preview-default-content');
            }
        },
        buttons: {
            type: Array,
            default: function() {
                return [];
            }
        },
        media: {
            type: Object,
            required: true,
        },
    },
    computed: {
        isAndroidPlatformSelected: function() {
            return this.selectedPlatform === this.PlatformEnum.ANDROID;
        },
        isIOSPlatformSelected: function() {
            return this.selectedPlatform === this.PlatformEnum.IOS;
        },
        titlePreviewComponentsList: function() {
            return countlyPushNotification.helper.getPreviewMessageComponentsList(this.title);
        },
        contentPreviewComponentsList: function() {
            return countlyPushNotification.helper.getPreviewMessageComponentsList(this.content);
        },
        mediaPreview: function() {
            var result = {};
            result[this.PlatformEnum.ANDROID] = this.media[this.PlatformEnum.ANDROID] || {};
            result[this.PlatformEnum.IOS] = this.media[this.PlatformEnum.IOS] || {};
            result[this.PlatformEnum.ALL] = this.media[this.PlatformEnum.ALL] || {};
            return result;
        },
        hasAndroidPlatform: function() {
            return this.isPlatformFound(countlyPushNotification.service.PlatformEnum.ANDROID);
        },
        hasIOSPlatform: function() {
            return this.isPlatformFound(countlyPushNotification.service.PlatformEnum.IOS);
        },
    },
    watch: {
        platforms: function() {
            if (!this.selectedPlatform) {
                this.selectedPlatform = this.findInitialSelectedPlatform();
            }
            this.$emit('select', this.selectedPlatform);
        }
    },
    methods: {
        timeNow: function() {
            return moment().format("H:mm");
        },
        isPlatformFound: function(platformName) {
            return this.platforms.filter(function(propPlatformItem) {
                return propPlatformItem === platformName;
            }).length > 0;
        },
        findInitialSelectedPlatform: function() {
            if (this.isPlatformFound(countlyPushNotification.service.PlatformEnum.IOS)) {
                return countlyPushNotification.service.PlatformEnum.IOS;
            }
            if (this.isPlatformFound(countlyPushNotification.service.PlatformEnum.ANDROID)) {
                return countlyPushNotification.service.PlatformEnum.ANDROID;
            }
            return null;
        },
        isVideo: function(mime) {
            return this.videoRegex.test(mime);
        },
        setSelectedPlatform: function(value) {
            this.selectedPlatform = value;
        },
        onPlatformChange: function() {
            this.$emit('select', this.selectedPlatform);
        }
    },
    components: {
        'user-property-preview': UserPropertyPreview,
        'user-property-text-preview': UserPropertyTextPreview
    }
};
</script>
