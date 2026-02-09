<template>
    <div>
        <div class="setup-logo" data-test-id="countly-logo"></div>
        <div id="consent" data-test-id="consent" class="centered-content">
            <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center">
                <div class="bu-is-size-4 bu-mb-6" data-test-id="page-title">{{ i18n('initial-setup.consent-title') }}</div>
                <cly-form
                    :initial-edited-object="newConsent"
                    class="consent-form"
                    @submit="handleSubmit">
                    <template v-slot="formScope">
                        <cly-form-step :id="'consent'">
                            <cly-form-field v-for="item in consentItems" :key="item._id">
                                <template v-if="item.type !== 'tracking' || !isCountlyHosted">
                                    <div class="consent-blurb bu-mb-5" :data-test-id="`page-description-${item.type}`">{{ decodeHtmlEntities(item.description) }}</div>
                                    <div class="consent-question bu-mb-5" :data-test-id="`page-question-${item.type}`">{{ item.question }}</div>
                                    <validation-provider tag="div" class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned" :name="'countly_' + item.type" rules="required">
                                        <el-radio
                                            v-model="formScope.editedObject['countly_' + item.type]"
                                            :label="true"
                                            class="is-autosized"
                                            :test-id="`enable-${item.type}`"
                                            border>
                                            <div class="text-medium">{{ item.optinText }}</div>
                                        </el-radio>
                                        <el-radio
                                            v-model="formScope.editedObject['countly_' + item.type]"
                                            :label="false"
                                            class="is-autosized"
                                            :test-id="`dont-enable-${item.type}`"
                                            border>
                                            <div class="text-medium">{{ item.optoutText }}</div>
                                        </el-radio>
                                    </validation-provider>
                                </template>
                            </cly-form-field>
                        </cly-form-step>
                        <el-button
                            :disabled="!formScope.isSubmissionAllowed"
                            @click="formScope.submit()"
                            class="bu-is-block bu-mt-5 bu-mx-auto"
                            size="medium"
                            type="success"
                            data-test-id="continue-button">
                            {{i18n('common.continue')}}
                        </el-button>
                    </template>
                </cly-form>
            </div>
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import storejs from 'storejs';

// TO-DO: countlyPlugins is still legacy IIFE - no ESM exports available
var countlyPlugins = window.countlyPlugins;

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            mode: window.location.hash.includes('newsletter') ? 'newsletter' : 'consent',
            isCountlyHosted: true,
            newConsent: {
                countly_newsletter: true,
            },
        };
    },
    mounted: function() {
        if (this.mode === 'newsletter') {
            storejs.set('disable_newsletter_prompt', true);
        }
        this.$store.dispatch('countlyOnboarding/fetchConsentItems');
    },
    computed: {
        consentItems: function() {
            var items = this.$store.getters['countlyOnboarding/consentItems'];
            if (this.mode === 'newsletter') {
                return items.filter(function(item) {
                    return item.type === 'newsletter';
                });
            }
            return items;
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
            var self = this;
            var countly_newsletter = doc.countly_newsletter;
            delete doc.countly_newsletter;

            if (this.mode === 'newsletter') {
                if (countly_newsletter) {
                    this.$store.dispatch('countlyOnboarding/sendNewsletterSubscription', {
                        name: countlyGlobal.member.full_name.split(' ')[0],
                        email: countlyGlobal.member.email,
                        countlyType: countlyGlobal.countlyTypeTrack
                    });
                }

                this.$store.dispatch('countlyOnboarding/updateUserNewsletter', {
                    user_id: countlyGlobal.member._id,
                    subscribe_newsletter: countly_newsletter,
                }).finally(function() {
                    countlyGlobal.member.subscribe_newsletter = countly_newsletter;
                    window.location.href = '#/home';
                    window.location.reload();
                });
            }
            else {
                this.$store.dispatch('countlyOnboarding/updateUserNewsletter', {
                    user_id: countlyGlobal.member._id,
                    subscribe_newsletter: countly_newsletter,
                });

                if (countly_newsletter) {
                    this.$store.dispatch('countlyOnboarding/sendNewsletterSubscription', {
                        name: countlyGlobal.member.full_name.split(' ')[0],
                        email: countlyGlobal.member.email,
                        countlyType: countlyGlobal.countlyTypeTrack
                    });
                }

                var configs = {
                    frontend: doc,
                };

                countlyPlugins.updateConfigs(configs);
                window.location.href = '#/home';
                window.location.reload();
            }
        },
    }
};
</script>
