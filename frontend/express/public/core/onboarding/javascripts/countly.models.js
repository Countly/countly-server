/*global CV, countlyCommon, countlyCMS */

(function(countlyOnboarding) {

    countlyCMS.fetchEntry('server-consents');
    countlyCMS.fetchEntry('server-intro-video');
    countlyCMS.fetchEntry('server-quick-start', { populate: true });

    countlyOnboarding.generateAPIKey = function() {
        var length = 40;
        var text = [];
        var chars = 'abcdef';
        var numbers = '0123456789';
        var all = chars + numbers;

        //1 char
        text.push(chars.charAt(Math.floor(Math.random() * chars.length)));
        //1 number
        text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));

        var j, x, i;
        //5 any chars
        for (i = 0; i < Math.max(length - 2, 5); i++) {
            text.push(all.charAt(Math.floor(Math.random() * all.length)));
        }

        //randomize order
        for (i = text.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = text[i - 1];
            text[i - 1] = text[j];
            text[j] = x;
        }

        return text.join('');
    };

    countlyOnboarding.quickstartContent = '<div><div class="bu-has-text-weight-medium">Quick Start Guide</div>' +
        '<div class="bu-mt-4 quickstart-item">' +
        '<div class="bu-mr-2"><img src="./images/dashboard/onboarding/light-bulb.svg" /></div>' +
        '<div>' +
        '<a href="#/manage/users" class="quickstart-link bu-is-block bu-has-text-weight-medium">Invite new users <i class="ion-arrow-right-c"></i></a><div class="quickstart-item-desc bu-is-size-7">Invite users for your project to join you for collaboration</div>' +
        '</div>' +
        '</div>' +
        '<div class="bu-mt-2 quickstart-item">' +
        '<div class="bu-mr-2"><img src="./images/dashboard/onboarding/light-bulb.svg" /></div>' +
        '<div>' +
        '<a href="#/manage/apps" class="quickstart-link bu-is-block bu-has-text-weight-medium">Create a new application <i class="ion-arrow-right-c"></i></a><div class="quickstart-item-desc bu-is-size-7">Create a new application for your project to join you for collaboration</div>' +
        '</div>' +
        '</div>' +
        '<div class="bu-mt-2 quickstart-item">' +
        '<div class="bu-mr-2"><img src="./images/dashboard/onboarding/light-bulb.svg" /></div>' +
        '<div>' +
        '<a href="https://support.count.ly/hc/en-us" class="quickstart-link bu-is-block bu-has-text-weight-medium">Explore Countly Guides <i class="ion-android-open"></i></a><div class="quickstart-item-desc bu-is-size-7">Explore Countly Guides for your project to join you for collaboration</div>' +
        '</div>' +
        '</div>' +
        '<div class="bu-mt-2 quickstart-item">' +
        '<div class="bu-mr-2"><img src="./images/dashboard/onboarding/light-bulb.svg" /></div>' +
        '<div>' +
        '<a href="https://support.count.ly/hc/en-us/sections/360007310512-SDKs" class="quickstart-link bu-is-block bu-has-text-weight-medium">Find your Countly SDK <i class="ion-android-open"></i></a><div class="quickstart-item-desc bu-is-size-7">Find your Countly SDK for your project to join you for collaboration</div>' +
        '</div>' +
        '</div>' +
        '<div class="bu-mt-2 quickstart-item">' +
        '<div class="bu-mr-2"><img src="./images/dashboard/onboarding/light-bulb.svg" /></div>' +
        '<div>' +
        '<a href="https://discord.gg/countly" class="quickstart-link bu-is-block bu-has-text-weight-medium">Join Countly Community on Discord <i class="ion-android-open"></i></a><div class="quickstart-item-desc bu-is-size-7">Join Countly Community for your project to join you for collaboration</div>' +
        '</div>' +
        '</div>' +
        '</div>';

    countlyOnboarding.generateQuickstartContent = function(quickstartItems, quickstartHeadingTitle) {
        var headingTitle = quickstartHeadingTitle || CV.i18n('initial-setup.quickstart-title');
        var heading = '<div class="bu-has-text-weight-medium">' + headingTitle + '</div>';
        var body = '';

        quickstartItems.forEach(function(item) {
            var linkUrl = item.link;
            if (linkUrl.startsWith('/') && item.linkType === 'internal') {
                linkUrl = '#' + linkUrl;
            }
            var description = (item.description && item.description !== '-') ? item.description : '';
            var title = item.title;
            var target = item.linkType === 'external' ? 'target="_blank" rel="noreferrer noopener"' : '';
            var icon = item.linkType === 'internal' ? '<i class="ion-arrow-right-c"></i>' : '<i class="ion-android-open"></i>';

            body += '<div class="bu-mt-4 quickstart-item">' +
            '<div class="bu-mr-2"><img src="./images/dashboard/onboarding/light-bulb.svg" /></div>' +
            '<div>' +
            '<a href="' + linkUrl + '" class="quickstart-link bu-is-block bu-has-text-weight-medium" ' + target + '>' +
            title + ' ' + icon +
            '</a>' +
            '<div class="quickstart-item-desc bu-is-size-7">' + description + '</div>' +
            '</div>' +
            '</div>';
        });

        return '<div>' + heading + body + '</div>';
    };

    countlyOnboarding.getVuexModule = function() {
        var getEmptyState = function() {
            return {
                introVideos: {
                    videoLinkForCE: '',
                    videoLinkForEE: '',
                },
                consentItems: [],
            };
        };

        var getters = {
            introVideos: function(state) {
                return state.introVideos;
            },
            consentItems: function(state) {
                return state.consentItems;
            },
        };

        var mutations = {
            setIntroVideos: function(state, payload) {
                state.introVideos = payload;
            },
            setConsentItems: function(state, payload) {
                state.consentItems = payload;
            },
        };

        var actions = {
            createApp: function(context, payload) {
                return new Promise(function(resolve, reject) {
                    CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.apps.w + '/create',
                        data: {
                            args: JSON.stringify(payload)
                        },
                        dataType: "json",
                        success: function(response) {
                            resolve(response);
                            // data = response;
                            // data.locked = false;
                            // countlyGlobal.apps[data._id] = data;
                            // countlyGlobal.admin_apps[data._id] = data;
                            // self.$store.dispatch("countlyCommon/addToAllApps", data);
                            // countlyCommon.ACTIVE_APP_ID = data._id + "";
                            // app.onAppManagementSwitch(data._id + "", data && data.type || "mobile");
                            // self.$store.dispatch("countlyCommon/updateActiveApp", data._id + "");
                            // app.initSidebar();
                        },
                        error: function(xhr) {
                            reject(xhr.responseJSON);
                        }
                    });
                });
            },
            fetchIntroVideos: function(context) {
                countlyCMS.fetchEntry('server-intro-video').then(function(resp) {
                    context.commit('setIntroVideos', {
                        videoLinkForCE: resp.data[0].videoLinkForCE || '',
                        videoLinkForEE: resp.data[0].videoLinkForEE || '',
                    });
                });
            },
            fetchConsentItems: function(context) {
                countlyCMS.fetchEntry('server-consents').then(function(resp) {
                    context.commit('setConsentItems', resp.data);
                });
            },
            sendNewsletterSubscription: function(_, payload) {
                var baseUrl = 'https://hooks.zapier.com/';
                var path = 'hooks/catch/';
                var subpath = '538557/3mg2ybc/';

                CV.$.ajax({
                    type: 'GET',
                    url: baseUrl + path + subpath,
                    data: {
                        name: payload.name,
                        email: payload.email,
                    },
                });
            },
            updateUserNewsletter: function(_, payload) {
                return new Promise(function(resolve, reject) {
                    CV.$.ajax({
                        type: "POST",
                        url: countlyCommon.API_PARTS.data.w + '/users/update',
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            args: JSON.stringify(payload)
                        },
                        dataType: 'json',
                        success: function(response) {
                            resolve(response);
                        },
                        error: function(xhr) {
                            reject(xhr.responseJSON);
                        }
                    });
                });
            },
        };

        return CV.vuex.Module("countlyOnboarding", {
            state: getEmptyState,
            getters: getters,
            mutations: mutations,
            actions: actions,
        });
    };
})(window.countlyOnboarding = window.countlyOnboarding || {});
