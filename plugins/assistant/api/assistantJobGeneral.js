const assistantJobGeneral = {},
    plugins = require('../../pluginManager.js'),
    log = require('../../../api/utils/log.js')('assistantJob:module'),
    fetch = require('../../../api/parts/data/fetch.js'),
    async = require("async"),
    assistant = require("./assistant.js"),
    parser = require('rss-parser'),
    underscore = require('underscore'),
    versionInfo = require('../../../frontend/express/version.info');

(function (assistantJobGeneral) {
    const PLUGIN_NAME = "assistant-base-general";
    assistantJobGeneral.prepareNotifications = function (db, providedInfo) {
        return new Promise(function (resolve, reject) {
            try {
                log.i('Creating assistant notifications from [%j]', PLUGIN_NAME);
                const NOTIFICATION_VERSION = 1;

                //check if current server is try server
                const serverIsTry = versionInfo.trial === true;

                //check if current server is community edition
                const serverIsCE = versionInfo.type === "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6";

                // (3) generate announcment notifications
                //todo improve feed period selection so that it is possible to show the event immediate and not once per day

                const nowTimestamp = Date.now();//timestamp now ms
                const intervalMs = 24 * 60 * 60 * 1000;//the last 24 hours in ms

                let dataForFeedMap = [];
                // (3.1) blog page
                {
                    let feedDataBlog = {};
                    feedDataBlog.anc_i18n = "assistant.announcement-blog-post";
                    feedDataBlog.anc_type = assistant.NOTIF_TYPE_ANNOUNCEMENTS;
                    feedDataBlog.anc_subtype = 1;
                    feedDataBlog.anc_version = NOTIFICATION_VERSION;
                    feedDataBlog.url = 'https://medium.com/feed/countly';
                    feedDataBlog.targetHour = 11;
                    dataForFeedMap.push(feedDataBlog);
                }

                // (3.2) New iOS SDK release
                {
                    let feedDataIOS = {};
                    feedDataIOS.anc_i18n = "assistant.announcement-ios-release";
                    feedDataIOS.anc_type = assistant.NOTIF_TYPE_ANNOUNCEMENTS;
                    feedDataIOS.anc_subtype = 2;
                    feedDataIOS.anc_version = NOTIFICATION_VERSION;
                    feedDataIOS.url = 'https://github.com/countly/countly-sdk-ios/releases.atom';
                    feedDataIOS.targetHour = 12;
                    dataForFeedMap.push(feedDataIOS);
                }

                // (3.3) New Android SDK release
                {
                    let feedDataAndroid = {};
                    feedDataAndroid.anc_i18n = "assistant.announcement-android-release";
                    feedDataAndroid.anc_type = assistant.NOTIF_TYPE_ANNOUNCEMENTS;
                    feedDataAndroid.anc_subtype = 3;
                    feedDataAndroid.anc_version = NOTIFICATION_VERSION;
                    feedDataAndroid.url = 'https://github.com/countly/countly-sdk-android/releases.atom';
                    feedDataAndroid.targetHour = 13;
                    dataForFeedMap.push(feedDataAndroid);
                }

                if(serverIsCE) {
                    // (3.4) New community server release
                    {
                        let feedDataCommunity = {};
                        feedDataCommunity.anc_i18n = "assistant.announcement-community-server-release";
                        feedDataCommunity.anc_type = assistant.NOTIF_TYPE_ANNOUNCEMENTS;
                        feedDataCommunity.anc_subtype = 4;
                        feedDataCommunity.anc_version = NOTIFICATION_VERSION;
                        feedDataCommunity.url = 'https://github.com/Countly/countly-server/releases.atom';
                        feedDataCommunity.targetHour = 14;
                        dataForFeedMap.push(feedDataCommunity);
                    }
                }

                if(!serverIsCE) {
                    // (3.5) New server code release for EE
                    {
                        let feedDataEE = {};
                        feedDataEE.anc_i18n = "assistant.announcement-server-release-enterprise";
                        feedDataEE.anc_type = assistant.NOTIF_TYPE_ANNOUNCEMENTS;
                        feedDataEE.anc_subtype = 5;
                        feedDataEE.anc_version = NOTIFICATION_VERSION;
                        feedDataEE.url = 'https://github.com/Countly/countly-server/releases.atom';
                        feedDataEE.targetHour = 15;
                        dataForFeedMap.push(feedDataEE);
                    }
                }

                //go through all feeds
                async.each(dataForFeedMap, function (feedItem, callbackOuter) {
                    //collect needed feed items
                    parser.parseURL(feedItem.url, function(parserErr, parsed) {
                        if(parserErr !== null) {
                            log.w('Assistant plugin, feed reader returned error while reading feed. url: [%j] error: [%j] ', feedItem.url, parserErr);
                        } else {
                            let arrayForDataToNotify = [];
                            if (!underscore.isUndefined(parsed)) {
                                parsed.feed.entries.forEach(function (entry) {
                                    let eventTimestamp = Date.parse(entry.pubDate);//rss post timestamp
                                    let blog_post_ready = (nowTimestamp - eventTimestamp) <= intervalMs;//the rss post was published in the last 24 hours
                                    let data = [entry.title, entry.link];

                                    if (blog_post_ready) {
                                        arrayForDataToNotify.push({blog_post_ready: blog_post_ready, data: data});
                                    }
                                });

                            } else {
                                log.w('Assistant plugin, feed reader returned undefined! Probably timeout. url: [%j] error: [%j] ', feedItem.url, parserErr);
                            }
                            //go through collected feed items
                            async.each(arrayForDataToNotify, function (feedMiddleItem, callbackMiddle) {
                                //go through all apps
                                async.each(providedInfo.appsData, function (ret_app_data, callbackInner) {
                                    let apc = assistant.preparePluginSpecificFields(providedInfo, ret_app_data, PLUGIN_NAME);
                                    let anc = assistant.prepareNotificationSpecificFields(apc, feedItem.anc_i18n, feedItem.anc_type, feedItem.anc_subtype, feedItem.anc_version);

                                    assistant.createNotificationIfRequirementsMet(-1, feedItem.targetHour, (feedMiddleItem.blog_post_ready), feedMiddleItem.data, anc);
                                    callbackInner(null);
                                }, function (err) {
                                    if (err !== null) {
                                        log.w('Assistant feed generation internal resolving with error:[%j]', err);
                                    }
                                    callbackMiddle(null);
                                });

                            }, function (feedHandlerErr) {
                                if (feedHandlerErr !== null) {
                                    log.w('Assistant feed generation middle resolving with error:[%j]', feedHandlerErr);
                                }
                                callbackOuter(null);
                            });
                        }
                    });
                    
                }, function (err) {
                    if(err !== null){
                        log.w('Assistant feed generation outer resolving with an error:[%j]', err);
                    } else {
                        log.i('Assistant for [%j] plugin resolving with no errors', PLUGIN_NAME);
                    }
                    resolve();
                });
            } catch (ex) {
                log.e('Assistant plugin [%j] FAILED with a exception [%j]', PLUGIN_NAME, { message: ex.message, stack: ex.stack });
                resolve();
            }
        });
    }
}(assistantJobGeneral));

module.exports = assistantJobGeneral;
