/*global VeeValidate,countlyPushNotification,Promise*/
(function() {
    var PushNotificationMessageMediaURLValidator = {
        validateMediaOnAll: function(metadata) {
            //TODO-LA
            if (metadata['content-type'] === 'image/jpeg') {
                return true;
            }
            return false;
        },
        validateMediaOnAndroid: function(metadata) {
            //TODO-LA
            if (metadata['content-type'] === 'image/jpeg') {
                return true;
            }
            return false;
        },
        validatedMediaOnIOS: function(metadata) {
            //TODO-LA
            if (metadata['content-type'] === 'image/jpeg') {
                return true;
            }
            return false;
        },
        validateMediaByPlatform: function(platform, metadata) {
            if (platform === countlyPushNotification.service.PlatformEnum.ALL) {
                return this.validateMediaOnAll(metadata);
            }
            if (platform === countlyPushNotification.service.PlatformEnum.ANDROID) {
                return this.validateMediaOnAndroid(metadata);
            }
            if (platform === countlyPushNotification.service.PlatformEnum.IOS) {
                return this.validatedMediaOnIOS(metadata);
            }
        },
        isValid: function(url, platform) {
            var self = this;
            return new Promise(function(resolve) {
                countlyPushNotification.service.fetchMediaMetadataWithDebounce(url,
                    function(metadata) {
                        resolve(self.validateMediaByPlatform(platform, metadata));
                    },
                    function() {
                        resolve(false);
                    });
            });
        }
    };
    VeeValidate.extend("push_notification_message_media_url", {
        validate: function(url, params) {
            return PushNotificationMessageMediaURLValidator.isValid(url, params.platform);
        },
        params: ['platform']
    });
})();