/*global CV, countlyCommon, countlyCMS */

(function(countlyOnboarding) {

    countlyCMS.fetchEntry('server-consents');
    countlyCMS.fetchEntry('server-intro-video');
    countlyCMS.fetchEntry('server-quick-start');

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

    countlyOnboarding.getVuexModule = function() {
        var getEmptyState = function() {
            return {
                introVideos: {
                    videoLinkForCE: '',
                    videoLinkForEE: '',
                },
            };
        };

        var getters = {
            introVideos: function(state) {
                return state.introVideos;
            },
        };

        var mutations = {
            setIntroVideos: function(state, payload) {
                state.introVideos = payload;
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
                        videoLinkForCE: resp.data[0].videoLinkForCE,
                        videoLinkForEE: resp.data[0].videoLinkForEE,
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
