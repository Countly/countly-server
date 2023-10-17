/*globals _,app,Backbone,Countly,CV,countlyCMS,countlyCommon,countlyGlobal,countlyOnboarding,CountlyHelpers,countlyPopulator,countlyPlugins,moment,store*/

(function() {
    var appSetupView = CV.views.create({
        template: CV.T('/core/onboarding/templates/app.html'),
        data: function() {
            var timezones = [];
            for (var key in countlyGlobal.timezones) {
                var country = countlyGlobal.timezones[key].n;
                if (countlyGlobal.timezones[key].z) {
                    for (var zone = 0; zone < countlyGlobal.timezones[key].z.length; zone++) {
                        var k = Object.keys(countlyGlobal.timezones[key].z[zone])[0];
                        var splat = k.split(' ');
                        timezones.push({
                            value: countlyGlobal.timezones[key].z[zone][k],
                            label: splat[1] + ', ' + country + ' ' + splat[0],
                        });
                    }
                }
            }

            var appTemplates = [];
            countlyPopulator.defaultTemplates.forEach(function(appTemplate) {
                appTemplates.push({
                    id: appTemplate._id,
                    name: appTemplate.name,
                });
            });

            var searchParams = new URLSearchParams(window.location.search);

            return {
                isDemoApp: searchParams.get('create_demo_app'),
                isPopulating: false,
                newApp: {},
                timezones: timezones,
                types: Object.keys(app.appTypes),
                appTemplates: appTemplates,
                populatorProgress: 0,
                populatorMaxTime: 60,
                isPopulatorFinished: false,
                isCountlyEE: countlyGlobal.plugins.includes('drill'),
            };
        },
        computed: {
            videoLink: function() {
                var introVideos = this.$store.getters['countlyOnboarding/introVideos'];

                if (this.isCountlyEE) {
                    return introVideos.videoLinkForEE;
                }

                return introVideos.videoLinkForCE;
            },
        },
        created: function() {
            delete countlyGlobal.licenseError;
            this.createNewApp();
        },
        methods: {
            createNewApp: function() {
                this.newApp = {};
                if (Intl && Intl.DateTimeFormat) {
                    this.newApp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    var timezones = countlyGlobal.timezones;
                    for (var countryCode in timezones) {
                        for (var i = 0; i < timezones[countryCode].z.length;i++) {
                            for (var countryTimezone in timezones[countryCode].z[i]) {
                                if (timezones[countryCode].z[i][countryTimezone] === this.newApp.timezone) {
                                    this.newApp.country = countryCode;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (this.isDemoApp) {
                    this.newApp.name = 'Demo App';
                    this.newApp.appTemplate = this.appTemplates[0].id;
                }

                this.newApp.type = Object.keys(app.appTypes)[0];
                this.newApp.key = countlyOnboarding.generateAPIKey();
            },
            populateApp: function() {
                var self = this;
                self.populatorProgress = 0;

                countlyPopulator.setStartTime(countlyCommon.periodObj.start / 1000);
                countlyPopulator.setEndTime(countlyCommon.periodObj.end / 1000);

                countlyPopulator.setSelectedTemplate(self.newApp.appTemplate);
                countlyPopulator.getTemplate(self.newApp.appTemplate, function(template) {
                    countlyPopulator.generateUsers(self.populatorMaxTime * 4, template);
                });
                var startTime = Math.round(Date.now() / 1000);
                var progressBar = setInterval(function() {
                    if (parseInt(self.populatorProgress, 10) < 100) {
                        self.populatorProgress = parseFloat((Math.round(Date.now() / 1000) - startTime) / self.populatorMaxTime) * 100;
                        if (self.populatorProgress > 100) {
                            self.populatorProgress = 100;
                        }
                    }
                    else {
                        self.populatorProgress = 100;
                        countlyPopulator.stopGenerating(true);
                        window.clearInterval(progressBar);
                        self.isPopulatorFinished = true;
                    }
                }, 1000);
            },
            handleSubmit: function(doc) {
                var self = this;
                if (this.isDemoApp) {
                    this.$store.dispatch('countlyOnboarding/fetchIntroVideos');
                }

                delete doc.appTemplate;

                this.$store.dispatch('countlyOnboarding/createApp', doc)
                    .then(function(response) {
                        response.locked = false;
                        countlyGlobal.apps[response._id] = response;
                        countlyGlobal.admin_apps[response._id] = response;
                        self.$store.dispatch("countlyCommon/addToAllApps", response);
                        countlyCommon.ACTIVE_APP_ID = response._id + "";
                        countlyCommon.ACTIVE_APP_KEY = response.key + "";
                        app.onAppManagementSwitch(response._id + "", response.type || "mobile");
                        self.$store.dispatch("countlyCommon/updateActiveApp", response._id + "");

                        if (self.isDemoApp) {
                            self.populateApp();
                            self.$store.dispatch('countlyOnboarding/fetchIntroVideos')
                                .finally(function() {
                                    self.isPopulating = true;
                                });
                        }
                        else {
                            app.navigate('#/initial-consent', true);
                        }
                    })
                    .catch(function(errResp) {
                        CountlyHelpers.notify({
                            message: errResp.result || CV.i18n('configs.not-changed'),
                            sticky: false,
                            type: 'error'
                        });
                    });
            },
            handleContinueClick: function() {
                app.navigate('#/initial-consent', true);
            },
        },
    });

    var consentView = CV.views.create({
        template: CV.T('/core/onboarding/templates/consent.html'),
        data: function() {
            return {
                isCountlyHosted: countlyGlobal.plugins.includes('tracker'),
                newConsent: {
                    countly_tracking: true,
                    countly_newsletter: true,
                },
            };
        },
        mounted: function() {
            this.$store.dispatch('countlyOnboarding/fetchConsentItems');
        },
        computed: {
            consentItems: function() {
                return this.$store.getters['countlyOnboarding/consentItems'];
            },
        },
        methods: {
            decodeHtmlEntities: function(inp) {
                var el = document.createElement('p');
                el.innerHTML = inp;

                var result = el.textContent || el.innerText;
                el = null;

                return result;
            },
            handleSubmit: function(doc) {
                var countly_newsletter = doc.countly_newsletter;
                delete doc.countly_newsletter;

                this.$store.dispatch('countlyOnboarding/updateUserNewsletter', {
                    user_id: countlyGlobal.member._id,
                    subscribe_newsletter: countly_newsletter,
                });

                if (countly_newsletter) {
                    this.$store.dispatch('countlyOnboarding/sendNewsletterSubscription', {
                        name: countlyGlobal.member.full_name.split(' ')[0],
                        email: countlyGlobal.member.email,
                    });
                }

                var configs = {
                    frontend: doc,
                };

                countlyPlugins.updateConfigs(configs);
                var domain = countlyGlobal.countly_domain || window.location.origin;

                try {
                    // try to extract hostname from full domain url
                    var urlObj = new URL(domain);
                    domain = urlObj.hostname;
                }
                catch (_) {
                    // do nothing, domain from config will be used as is
                }

                var statsUrl = 'https://stats.count.ly/i';

                try {
                    var uObj = new URL(countlyGlobal.frontend_server);
                    uObj.pathname = '/i';
                    statsUrl = uObj.href;
                }
                catch (_) {
                    // do nothing, statsUrl will be used as is
                }

                CV.$.ajax({
                    type: 'GET',
                    url: statsUrl,
                    data: {
                        consent: JSON.stringify({countly_tracking: doc.countly_tracking}),
                        app_key: countlyGlobal.frontend_app,
                        device_id: Countly.device_id || domain,
                    },
                    dataType: 'json',
                    complete: function() {
                        // go home
                        window.location.href = '#/home';
                        window.location.reload();
                    }
                });
            },
        }
    });

    var newsletterView = CV.views.create({
        template: CV.T('/core/onboarding/templates/consent.html'),
        data: function() {
            return {
                isCountlyHosted: countlyGlobal.plugins.includes('tracker'),
                newConsent: {
                    countly_newsletter: true,
                },
            };
        },
        mounted: function() {
            store.set('disable_newsletter_prompt', true);
            this.$store.dispatch('countlyOnboarding/fetchConsentItems');
        },
        computed: {
            consentItems: function() {
                return this.$store.getters['countlyOnboarding/consentItems']
                    .filter(function(item) {
                        return item.type === 'newsletter';
                    });
            },
        },
        methods: {
            decodeHtmlEntities: function(inp) {
                var el = document.createElement('p');
                el.innerHTML = inp;

                var result = el.textContent || el.innerText;
                el = null;

                return result;
            },
            handleSubmit: function(doc) {
                var countly_newsletter = doc.countly_newsletter;
                delete doc.countly_newsletter;

                this.$store.dispatch('countlyOnboarding/updateUserNewsletter', {
                    user_id: countlyGlobal.member._id,
                    subscribe_newsletter: countly_newsletter,
                });

                if (countly_newsletter) {
                    this.$store.dispatch('countlyOnboarding/sendNewsletterSubscription', {
                        name: countlyGlobal.member.full_name.split(' ')[0],
                        email: countlyGlobal.member.email,
                    });
                }

                // go home
                app.navigate('#/', true);
            },
        }
    });

    var notRespondedConsentView = CV.views.create({
        template: CV.T('/core/onboarding/templates/consent.html'),
        data: function() {
            return {
                isCountlyHosted: countlyGlobal.plugins.includes('tracker'),
                newConsent: {
                    countly_tracking: null,
                },
            };
        },
        mounted: function() {
            this.$store.dispatch('countlyOnboarding/fetchConsentItems');
        },
        computed: {
            consentItems: function() {
                return this.$store.getters['countlyOnboarding/consentItems']
                    .filter(function(item) {
                        return item.type === 'tracking';
                    });
            },
        },
        methods: {
            decodeHtmlEntities: function(inp) {
                var el = document.createElement('p');
                el.innerHTML = inp;

                var result = el.textContent || el.innerText;
                el = null;

                return result;
            },
            handleSubmit: function(doc) {
                var configs = {
                    frontend: doc,
                };

                countlyPlugins.updateConfigs(configs);
                var domain = countlyGlobal.countly_domain || window.location.origin;

                try {
                    // try to extract hostname from full domain url
                    var urlObj = new URL(domain);
                    domain = urlObj.hostname;
                }
                catch (_) {
                    // do nothing, domain from config will be used as is
                }

                var statsUrl = 'https://stats.count.ly/i';

                try {
                    var uObj = new URL(countlyGlobal.frontend_server);
                    uObj.pathname = '/i';
                    statsUrl = uObj.href;
                }
                catch (_) {
                    // do nothing, statsUrl will be used as is
                }

                CV.$.ajax({
                    type: 'GET',
                    url: statsUrl,
                    data: {
                        consent: JSON.stringify({countly_tracking: doc.countly_tracking}),
                        app_key: countlyGlobal.frontend_app,
                        device_id: Countly.device_id || domain,
                    },
                    dataType: 'json',
                    complete: function() {
                        // go home
                        window.location.href = '#/home';
                        window.location.reload();
                    }
                });

                // go home
                app.navigate('#/', true);
            },
        }
    });

    app.route('/initial-setup', 'initial-setup', function() {
        this.renderWhenReady(new CV.views.BackboneWrapper({
            component: appSetupView,
            vuex: [{ clyModel: countlyOnboarding }],
        }));
    });

    app.route('/initial-consent', 'initial-consent', function() {
        this.renderWhenReady(new CV.views.BackboneWrapper({
            component: consentView,
            vuex: [{ clyModel: countlyOnboarding }],
        }));
    });

    app.route('/not-responded-consent', 'not-responded-consent', function() {
        this.renderWhenReady(new CV.views.BackboneWrapper({
            component: notRespondedConsentView,
            vuex: [{ clyModel: countlyOnboarding }],
        }));
    });

    app.route('/not-subscribed-newsletter', 'not-subscribed-newsletter', function() {
        this.renderWhenReady(new CV.views.BackboneWrapper({
            component: newsletterView,
            vuex: [{ clyModel: countlyOnboarding }],
        }));
    });

    var sessionCount = countlyGlobal.member.session_count || 0;
    var isGlobalAdmin = countlyGlobal.member.global_admin;

    countlyCMS.fetchEntry('server-quick-start', { populate: true }).then(function(resp) {
        if (resp.data && resp.data.length) {
            var showForNSessions = resp.data[0].showForNSessions;

            if (!_.isEmpty(countlyGlobal.apps) && sessionCount <= showForNSessions && Array.isArray(resp.data[0].links)) {
                var quickstartHeadingTitle = resp.data[0].title;
                var quickstartItems = resp.data[0].links.filter(function(item) {
                    if (item.forUserType === 'all') {
                        return true;
                    }
                    else if (item.forUserType === 'globalAdmin' && isGlobalAdmin) {
                        return true;
                    }

                    return false;
                });

                if (quickstartItems.length > 0) {
                    var content = countlyOnboarding.generateQuickstartContent(quickstartItems, quickstartHeadingTitle);
                    CountlyHelpers.showQuickstartPopover(content);
                }
            }
        }
    });

    if (typeof countlyGlobal.countly_tracking !== 'boolean' && isGlobalAdmin) {
        if (Backbone.history.fragment !== '/not-responded-consent') {
            app.navigate("/not-responded-consent", true);
        }
    }
    else if (!countlyGlobal.member.subscribe_newsletter && !store.get('disable_newsletter_prompt') && (countlyGlobal.member.login_count === 3 || moment().dayOfYear() % 90 === 0)) {
        if (Backbone.history.fragment !== '/not-subscribed-newsletter') {
            app.navigate("/not-subscribed-newsletter", true);
        }
    }
    else if (!countlyGlobal.member.subscribe_newsletter && (countlyGlobal.member.login_count !== 3 && moment().dayOfYear() % 90 !== 0)) {
        store.set('disable_newsletter_prompt', false);
    }
})();