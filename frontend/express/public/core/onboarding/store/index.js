import { ajax, vuex, i18n } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import * as countlyCMS from '../../../javascripts/countly/countly.cms.js';

var countlyOnboarding = {};

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
countlyOnboarding.generateQuickstartContent = function(quickstartItems, quickstartHeadingTitle) {
    var headingTitle = quickstartHeadingTitle || i18n('initial-setup.quickstart-title');
    var heading = '<div class="bu-has-text-weight-medium" data-test-id="quickstart-title">' + headingTitle + '</div>';
    var body = '';

    quickstartItems.forEach(function(item) {
        var linkUrl = item.link;
        if (linkUrl.startsWith('/') && item.linkType === 'internal') {
            linkUrl = '#' + linkUrl;
        }
        var description = (item.description && item.description !== '-') ? item.description : '';
        var title = item.title;
        var target = item.linkType === 'external' ? 'target="_blank" rel="noreferrer noopener"' : '';
        var icon = item.linkType === 'internal' ? '<i class="ion-arrow-right-c" data-test-id="quickstart-item-arrow-' + item.title.toLowerCase().replace(/\s/g, "-") + '"></i>' : '<i class="ion-android-open" data-test-id="quickstart-item-ios-android-open-' + item.title.toLowerCase().replace(/\s/g, "-") + '"></i>';
        body += '<div class="bu-mt-4 quickstart-item" data-test-id="quickstart-item-' + item.title.toLowerCase().replace(/\s/g, "-") + '">' +
        '<div class="bu-mr-2" data-test-id="quickstart-item-icon-' + item.title.toLowerCase().replace(/\s/g, "-") + '"><img src="./images/dashboard/onboarding/light-bulb.svg" data-test-id="quickstart-item-svg-' + item.title.toLowerCase().replace(/\s/g, "-") + '"/></div>' +
        '<div>' +
        '<a href="' + linkUrl + '" class="quickstart-link bu-is-block bu-has-text-weight-medium" data-test-id="quickstart-item-link-' + item.title.toLowerCase().replace(/\s/g, "-") + '"' + target + '>' +
        title + ' ' + icon +
        '</a>' +
        '<div class="quickstart-item-desc bu-is-size-7" data-test-id="quickstart-item-desc-' + item.title.toLowerCase().replace(/\s/g, "-") + '">' + description + '</div>' +
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
                ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/create',
                    data: {
                        args: JSON.stringify(payload)
                    },
                    dataType: "json",
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr) {
                        reject(xhr.responseJSON);
                    }
                });
            });
        },
        fetchIntroVideos: function(context) {
            return countlyCMS.fetchEntry('server-intro-video', { CMSFirst: true }).then(function(resp) {
                context.commit('setIntroVideos', {
                    videoLinkForCE: resp.data[0].videoLinkForCE || '',
                    videoLinkForEE: resp.data[0].videoLinkForEE || '',
                });
            });
        },
        fetchConsentItems: function(context) {
            countlyCMS.fetchEntry('server-consents', { CMSFirst: true }).then(function(resp) {
                context.commit('setConsentItems', resp.data);
            });
        },
        sendNewsletterSubscription: function(_, payload) {
            var baseUrl = 'https://hooks.zapier.com/';
            var path = 'hooks/catch/';
            var subpath = '538557/3mg2ybc/';

            ajax({
                type: 'GET',
                url: baseUrl + path + subpath,
                data: {
                    name: payload.name,
                    email: payload.email,
                    countlyType: payload.countlyType
                },
            });
        },
        updateUserNewsletter: function(_, payload) {
            return new Promise(function(resolve, reject) {
                ajax({
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

    return vuex.Module("countlyOnboarding", {
        state: getEmptyState,
        getters: getters,
        mutations: mutations,
        actions: actions,
    });
};

export default countlyOnboarding;
