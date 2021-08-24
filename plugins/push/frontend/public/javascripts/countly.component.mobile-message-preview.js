
/*global CV, countlyVue, countlyPushNotification,countlyGlobal,countlyCommon,moment*/
(function(countlyPushNotificationComponent) {

    countlyPushNotificationComponent.UserPropertyTextPreview = countlyVue.views.create({
        template: '<span>{{value}}</span>',
        props: {
            value: {
                type: String,
                required: true
            }
        }
    });

    countlyPushNotificationComponent.UserPropertyPreview = countlyVue.views.create({
        template: '<span v-tooltip.bottom.center="description" class="cly-vue-push-notification-mobile-preview__user-property">{{fallback}}</span>',
        props: {
            value: {
                type: Object,
                required: true,
            },
        },
        computed: {
            userProperty: function() {
                return this.value.userProperty;
            },
            fallback: function() {
                return this.value.fallback;
            },
            description: function() {
                return "User's \"" + this.userProperty + "\" property which falls back to " + this.fallback;
            }
        }
    });


    countlyPushNotificationComponent.MobileMessagePreview = countlyVue.views.create({
        template: CV.T("/push/templates/mobile-message-preview.html"),
        data: function() {
            return {
                selectedPlatform: this.findInitialSelectedPlatform(),
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                MediaTypeEnum: countlyPushNotification.service.MediaTypeEnum,
                appName: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name || CV.i18n('push-notification.mobile-preview-default-app-name')
            };
        },
        props: {
            platforms: {
                type: Array,
                default: []
            },
            title: {
                type: String,
                default: CV.i18n('push-notification.mobile-preview-default-title')
            },
            content: {
                type: String,
                default: CV.i18n('push-notification.mobile-preview-default-content'),
            },
            buttons: {
                type: Array,
                default: []
            },
            media: {
                type: Object,
                required: true,
            },
            isHTML: {
                type: Boolean,
                required: false,
                default: false,
            }
        },
        computed: {
            isAndroidPlatformSelected: function() {
                return this.selectedPlatform === this.PlatformEnum.ANDROID;
            },
            isIOSPlatformSelected: function() {
                return this.selectedPlatform === this.PlatformEnum.IOS;
            },
            titlePreviewComponentsList: function() {
                return this.getPreviewComponentsList(this.title);
            },
            contentPreviewComponentsList: function() {
                return this.getPreviewComponentsList(this.content);
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
            setSelectedPlatform: function(value) {
                this.selectedPlatform = value;
            },
            getPreviewComponentsList: function(content) {
                var htmlTitle = document.createElement("div");
                htmlTitle.innerHTML = content;
                var components = [];
                htmlTitle.childNodes.forEach(function(node, index) {
                    if (node.hasChildNodes()) {
                        var withAttribues = htmlTitle.childNodes[index];
                        node.childNodes.forEach(function(childNode) {
                            if (childNode.nodeValue) {
                                var selectedProperty = withAttribues.getAttributeNode('data-user-property-label').value;
                                var fallbackValue = withAttribues.getAttributeNode('data-user-property-fallback').value;
                                components.push({name: 'user-property-preview', value: {fallback: fallbackValue, userProperty: selectedProperty}});
                            }
                        });
                    }
                    else {
                        if (node.nodeValue) {
                            components.push({name: 'user-property-text-preview', value: node.nodeValue});
                        }
                    }
                });
                return components;
            }
        },
        components: {
            'user-property-preview': countlyPushNotificationComponent.UserPropertyPreview,
            'user-property-text-preview': countlyPushNotificationComponent.UserPropertyTextPreview
        }
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});