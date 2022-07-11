/*global VeeValidate,countlyPushNotification*/
(function() {
    var PushNotificationMessageMediaURLValidator = {
        MAX_IMAGE_FILE_SIZE_IN_MB: 10,
        MAX_IOS_VIDEO_FILE_SIZE_IN_MB: 50,
        supportedIOSVideoFileExtensions: ['mpeg', 'mpeg2', 'mpg', 'mp4', 'avi'],
        supportedImageFileExtensions: ['jpeg', 'jpg', 'png', 'gif'],
        isImageFile: function(metadata) {
            return metadata.type === countlyPushNotification.service.MediaTypeEnum.IMAGE;
        },
        isVideoFile: function(metadata) {
            return metadata.type === countlyPushNotification.service.MediaTypeEnum.VIDEO;
        },
        isImageFileValid: function(metadata) {
            return this.supportedImageFileExtensions.some(function(supportedImageFile) {
                return supportedImageFile === metadata.extension;
            }) && metadata.size < this.MAX_IMAGE_FILE_SIZE_IN_MB;
        },
        isIOSVideoFileValid: function(metadata) {
            return this.supportedIOSVideoFileExtensions.some(function(supportedIOSVideoFile) {
                return supportedIOSVideoFile === metadata.extension;
            }) && metadata.size < this.MAX_IOS_VIDEO_FILE_SIZE_IN_MB;
        },
        validatedMediaOnIOS: function(metadata) {
            if (this.isImageFile(metadata)) {
                return this.isImageFileValid(metadata);
            }
            if (this.isVideoFile(metadata)) {
                return this.isIOSVideoFileValid(metadata);
            }
            return false;
        },
        validateMediaOnAll: function(metadata) {
            if (this.isImageFile(metadata)) {
                return this.isImageFileValid(metadata);
            }
            return false;
        },
        validateMediaByPlatform: function(platform, metadata) {
            if (platform === countlyPushNotification.service.PlatformEnum.ALL || platform === countlyPushNotification.service.PlatformEnum.ANDROID) {
                return this.validateMediaOnAll(metadata);
            }
            if (platform === countlyPushNotification.service.PlatformEnum.IOS) {
                return this.validatedMediaOnIOS(metadata);
            }
            return false;
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

    VeeValidate.extend('push_notification_fallback', {
        computesRequired: true,
        validate: function(value) {
            if (value === ' ') {
                return true;
            }
            return Boolean(value);
        }
    });
})();