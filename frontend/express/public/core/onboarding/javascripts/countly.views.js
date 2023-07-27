/*globals _,app,Countly,CV,countlyCMS,countlyCommon,countlyGlobal,countlyOnboarding,CountlyHelpers,countlyPopulator,countlyPlugins*/

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
            if (this.isDemoApp) {
                this.$store.dispatch('countlyOnboarding/fetchIntroVideos');
            }

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
                        if (Object.keys(countlyGlobal.apps).length && !CV.sideBarComponent) {
                            app.initSidebar();
                        }

                        if (self.isDemoApp) {
                            self.isPopulating = true;
                            self.populateApp();
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
        created: function() {
            this.$store.dispatch('countlyOnboarding/fetchConsentItems');
        },
        computed: {
            consentItems: function() {
                return this.$store.getters['countlyOnboarding/consentItems'];
            },
        },
        methods: {
            handleSubmit: function(doc) {
                var countly_newsletter = doc.countly_newsletter;
                delete doc.countly_newsletter;

                if (countly_newsletter) {
                    var name = countlyGlobal.member.full_name.split(' ')[0];
                    var email = countlyGlobal.member.email;
                    var baseUrl = 'https://hooks.zapier.com/';
                    var path = 'hooks/catch/';
                    var subpath = '538557/3mg2ybc/';

                    CV.$.ajax({
                        type: 'GET',
                        url: baseUrl + path + subpath,
                        data: {
                            name: name,
                            email: email,
                        },
                    });
                }

                var configs = {
                    frontend: doc,
                };

                countlyPlugins.updateConfigs(configs);

                CV.$.ajax({
                    type: 'GET',
                    url: Countly.url + '/i',
                    data: {
                        consent: JSON.stringify({countly_tracking: doc.countly_tracking}),
                        app_key: Countly.app_key,
                        device_id: Countly.device_id,
                    },
                    dataType: 'json',
                });

                // go home
                window.location.href = '#/home';
                window.location.reload();
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

    var loginCount = countlyGlobal.member.login_count || 0;

    countlyCMS.fetchEntry('server-quick-start').then(function(resp) {
        var showForNSessions = resp.data[0].showForNSessions;
        if (!_.isEmpty(countlyGlobal.apps) && loginCount <= showForNSessions) {
            CountlyHelpers.showQuickstartPopover(countlyOnboarding.quickstartContent);
        }
    });
})();