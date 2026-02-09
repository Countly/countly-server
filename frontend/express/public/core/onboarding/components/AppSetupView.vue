<template>
    <div>
        <div class="setup-logo" data-test-id="countly-logo"></div>
        <div id="initial-setup" data-test-id="initial-setup" class="centered-content">
            <div v-if="!isPopulating" class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center">
                <div class="bu-is-size-4" data-test-id="initial-setup-title">
                    {{ isDemoApp ? i18n('initial-setup.add-demo-application-title') : i18n('initial-setup.add-first-application-title') }}
                </div>
                <div v-if="!isDemoApp" data-test-id="initial-setup-sub-title" class="setup-byline">{{ i18n('initial-setup.add-first-application-byline') }}</div>
                <cly-form
                    :initial-edited-object="newApp"
                    class="setup-form bu-mt-5"
                    @submit="handleSubmit">
                    <template v-slot="formScope">
                        <cly-form-step :id="'create-app'">
                            <cly-form-field v-if="!isDemoApp" rules="required" test-id= "application-name" :label="i18n('management-applications.application-name')" :name="i18n('management-applications.application-name')" v-slot="v">
                                <div class="bu-is-relative">
                                    <el-input
                                        class="bu-mt-1"
                                        :placeholder="i18n('management-applications.application-name')"
                                        v-model="formScope.editedObject.name"
                                        test-id="app-name-input">
                                    </el-input>
                                    <span class="el-form-item__error bu-is-size-7" data-test-id= "app-name-error">{{v.errors[0]}}</span>
                                </div>
                            </cly-form-field>
                            <cly-form-field :label="i18n('initial-setup.application-type-label')" test-id="select-application-type-form">
                                <div class="setup-radio setup-radio-grid bu-mt-2">
                                    <el-radio
                                        v-for="type in types"
                                        :key="type"
                                        v-model="formScope.editedObject.type"
                                        :label="type"
                                        class="is-autosized"
                                        :test-id="`initial-setup-${type}`"
                                        border>
                                        <div class="setup-radio-item">
                                            <div class="setup-radio-icon-bg bu-mr-2">
                                                <i :data-test-id="`initial-setup-${type}-icon`" :class="getIconClass(type)"></i>
                                            </div>
                                            <div>
                                                <div class="text-medium bu-is-capitalized" :data-test-id="`initial-setup-${type}-label`">{{type}}</div>
                                                <div class="text-medium">{{i18n('initial-setup.application')}}</div>
                                            </div>
                                        </div>
                                    </el-radio>
                                </div>
                            </cly-form-field>
                            <cly-form-field :label="i18n('initial-setup.time-zone-label')" test-id='select-timezone-form' :tooltip="i18n('management-applications.time-zone.hint')">
                                <cly-select-x
                                    :placeholder="i18n('management-applications.time-zone')"
                                    v-model="formScope.editedObject.timezone"
                                    class="cly-is-fullwidth bu-mt-1"
                                    :options="timezones"
                                    test-id="select-timezone-dropdown">
                                </cly-select-x>
                            </cly-form-field>
                            <cly-form-field v-if="!isDemoApp" test-id= "application-key" :label="i18n('management-applications.app-key')" :tooltip="i18n('management-applications.app-key.hint')" :name="i18n('management-applications.app-key')" rules="required" v-slot="v">
                                <div class="bu-is-relative">
                                    <el-input
                                        class="bu-mt-1"
                                        :placeholder="i18n('management-applications.app-key')"
                                        v-model="formScope.editedObject.key"
                                        test-id="app-key-input">
                                    </el-input>
                                    <span class="el-form-item__error bu-is-size-7" data-test-id= "app-key-error">{{v.errors[0]}}</span>
                                </div>
                            </cly-form-field>
                            <cly-form-field v-if="isDemoApp" test-id='select-demo-type-form' :label="i18n('initial-setup.application-sample-label')">
                                <div class="setup-radio setup-radio-grid bu-mt-2">
                                    <el-radio
                                        v-for="appTemplate in appTemplates"
                                        :key="appTemplate.id"
                                        v-model="formScope.editedObject.appTemplate"
                                        :label="appTemplate.id"
                                        class="is-autosized"
                                        :test-id="`app-template-${appTemplate.name.toLowerCase()}`"
                                        border>
                                        <div class="setup-radio-item">
                                            <div class="setup-radio-icon-bg bu-mr-2">
                                                <i :data-test-id="`app-template-${appTemplate.name.toLowerCase().replaceAll(' ', '-')}-icon`" :class="getIconClass(appTemplate.name.toLowerCase().replace(' ', '-'))"></i>
                                            </div>
                                            <div>
                                                <div class="text-medium bu-is-capitalized">{{appTemplate.name}}</div>
                                            </div>
                                        </div>
                                    </el-radio>
                                </div>
                            </cly-form-field>
                        </cly-form-step>
                        <el-button
                            :disabled="!formScope.isSubmissionAllowed"
                            @click="formScope.submit()"
                            class="bu-is-block bu-mt-2 bu-mx-auto"
                            size="medium"
                            type="success"
                            data-test-id="continue-submit-button">
                            {{ buttonText }}
                        </el-button>
                    </template>
                </cly-form>
            </div>
            <div v-else class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center">
                <video controls class="bu-is-block bu-mx-auto setup-video-container" v-if="videoLink.length">
                    <source :src="videoLink"/>
                </video>
                <img :src="'images/dashboard/onboarding/video-placeholder.svg'" data-test-id="populator-progress-bar-img" class="bu-is-block bu-mx-auto" v-else/>
                <template v-if="!isPopulatorFinished">
                    <cly-progress-bar :percentage="populatorProgress" data-test-id="populator-progress" :color="'#0166D6'" :height="16" class="bu-mt-4 populator-start-modal-wrapper__proggress-bar"></cly-progress-bar>
                    <div class="setup-byline" data-test-id="populator-progress-text">Populating data for your app</div>
                </template>
                <el-button
                    v-else
                    @click="handleContinueClick"
                    class="bu-is-block bu-mt-5 bu-mx-auto bu-px-6"
                    size="medium"
                    type="success"
                    data-test-id="continue-button">
                    {{i18n('common.continue')}}
                </el-button>
            </div>
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import { notify } from '../../../javascripts/countly/countly.helpers.js';
import app from '../../../javascripts/countly/countly.template.js';
import countlyOnboarding from '../store/index.js';

// TO-DO: countlyPopulator is still legacy IIFE - no ESM exports available
var countlyPopulator = window.countlyPopulator;

export default {
    mixins: [i18nMixin],
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
            populatorMaxTime: 30,
            isPopulatorFinished: false,
            isCountlyEE: countlyGlobal.plugins.includes('drill'),
            selectedAppTemplate: null,
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
        buttonText: function() {
            if (this.isDemoApp) {
                return this.i18n('initial-setup.continue-data-population');
            }
            else {
                return this.i18n('initial-setup.create-application');
            }
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
                    for (var i = 0; i < timezones[countryCode].z.length; i++) {
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
            var selectedAppTemplate = self.selectedAppTemplate || self.newApp.appTemplate;

            countlyPopulator.setStartTime(countlyCommon.periodObj.start / 1000);
            countlyPopulator.setEndTime(countlyCommon.periodObj.end / 1000);
            countlyPopulator.setSelectedTemplate(selectedAppTemplate);
            countlyPopulator.setSelectedFeatures("all");
            countlyPopulator.getTemplate(selectedAppTemplate, function(template) {
                countlyPopulator.generateUsers(10, template);
                self.populatorProgress = 0;
                self.progressBar = setInterval(function() {
                    if (countlyPopulator.isGenerating()) {
                        self.populatorProgress = countlyPopulator.getCompletedRequestCount() / (template.uniqueUserCount) * 100;
                    }
                    else {
                        self.populatorProgress = 100;
                        countlyPopulator.stopGenerating(true);
                        window.clearInterval(self.progressBar);
                        self.isPopulatorFinished = true;
                    }
                }, 1000);
            });
        },
        handleSubmit: function(doc) {
            var self = this;
            if (this.isDemoApp) {
                this.$store.dispatch('countlyOnboarding/fetchIntroVideos');
            }
            self.selectedAppTemplate = doc.appTemplate;
            delete doc.appTemplate;

            this.$store.dispatch('countlyOnboarding/createApp', doc)
                .then(function(response) {
                    response.locked = false;
                    countlyGlobal.apps[response._id] = response;
                    countlyGlobal.admin_apps[response._id] = response;
                    self.$store.dispatch("countlyCommon/addToAllApps", response);
                    countlyCommon.setActiveApp(response._id);
                    app.onAppManagementSwitch(response._id + "", response.type || "mobile");

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
                    notify({
                        message: errResp.result || self.i18n('configs.not-changed'),
                        sticky: false,
                        type: 'error'
                    });
                });
        },
        handleContinueClick: function() {
            app.navigate('#/initial-consent', true);
        },
        getIconClass: function(appName) {
            var clyIo = 'cly-io cly-io-';
            var classMapper = {
                'entertainment': 'video-camera',
                'finance': 'currency-dollar',
                'b2b-saas': 'presentation-chart-line',
                'healthcare': 'heart',
                'e-commerce': 'shopping-bag',
                'social': 'emoji-happy',
                'mobile': 'device-mobile',
                'desktop': 'desktop-computer',
                'web': 'globe-alt',
            };
            return clyIo + classMapper[appName];
        }
    },
};
</script>
