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

            var searchParams = new URLSearchParams(window.location.search);

            return {
                isDemoApp: searchParams.get('create_demo_app'),
                isPopulating: false,
                newApp: {},
                timezones: timezones,
                types: Object.keys(app.appTypes),
                appTemplates: [],
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
            var self = this;

            if (this.isDemoApp) {
                countlyPopulator.getTemplates(function(appTemplates) {
                    appTemplates.forEach(function(appTemplate) {
                        self.appTemplates.push({
                            id: appTemplate._id,
                            name: appTemplate.name,
                        });
                    });
                    self.$store.dispatch('countlyOnboarding/fetchIntroVideos');

                    self.createNewApp();
                });
            }
            else {
                this.createNewApp();
            }
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
                    if (parseInt(self.populatorProgress) < 100) {
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
                        app.onAppManagementSwitch(response._id + "", response && response.type || "mobile");
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
                // var countly_newsletter = doc.countly_newsletter;
                delete doc.countly_newsletter;
                // do some requests
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

    var content = '<div><div class="bu-has-text-weight-medium">Quick Start Guide</div>' +
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

    var loginCount = countlyGlobal.member.login_count || 0;

    countlyCMS.fetchEntry('server-quick-start').then(function(resp) {
        var showForNSession = resp.data[0].showForNSession;
        if (!_.isEmpty(countlyGlobal.apps) && loginCount <= showForNSession) {
            CountlyHelpers.showQuickstartPopover(content);
        }
    });
})();