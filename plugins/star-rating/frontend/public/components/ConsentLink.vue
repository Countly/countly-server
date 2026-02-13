<template>
    <div class="bu-py-1 bu-px-4 cly-vue-drawer-step__section-group--filled">
        <div class="cly-vue-drawer-step__section">
            <div class="text-small text-heading bu-pb-1">{{i18n('rating.drawer.consent.text')}}</div>
            <validation-provider name="value.consent" rules="required|max:94" v-slot="v">
                <el-input
                    test-id="ratings-drawer-settings-add-user-consent-text-input"
                    class="cly-vue-drawer__input-element"
                    :class="{'is-error': v.errors.length > 0}"
                    maxlength="95"
                    :placeholder="i18n('rating.drawer.consent.placeholder')"
                    v-model="value.finalText"
                >
                    <span
                        class="el-input__count"
                        slot="suffix"
                    >
                        <span class="el-input__count-inner">{{ value.finalText.length }}/94</span>
                    </span>
                </el-input>
            </validation-provider>
            <div class="bu-pt-4 text-small text-heading" data-test-id="ratings-drawer-settings-add-user-consent-links-label">
                {{i18n('rating.drawer.consent.links')}}
                <cly-tooltip-icon :tooltip="i18n('rating.drawer.links.tooltip')" icon="ion-help-circled" data-test-id="ratings-drawer-settings-add-user-consent-links-tooltip"></cly-tooltip-icon>
            </div>
            <div style="gap:8px" class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center bu-py-1" :key="idx" v-for="(item, idx) in value.link">
                <div class="cly-vue-surveys-drawer__consent__basis-text">
                    <validation-provider :name="item.text" rules="required" v-slot="v">
                        <el-input
                            :test-id="'ratings-drawer-settings-add-user-consent-links-text-input-' + idx"
                            :class="{'is-error': v.errors.length > 0}"
                            :placeholder="item.text"
                            v-model="item.textValue">
                        </el-input>
                    </validation-provider>
                </div>
                <div class="cly-vue-surveys-drawer__consent__basis">
                    <validation-provider name="item.link" rules="required" v-slot="v">
                        <el-input
                            :test-id="'ratings-drawer-settings-add-user-consent-links-link-input-' + idx"
                            :class="{'is-error': v.errors.length > 0}"
                            :placeholder="item.link"
                            v-model="item.linkValue">
                        </el-input>
                    </validation-provider>
                </div>
                <div @click="onDelete(idx)" class="cly-icon-button--gray bu-has-text-right" :data-test-id="'ratings-drawer-settings-add-user-consent-delete-link-icon-' + idx"><i class="ion-ios-close-empty bu-is-clickable ratings-drawer__consent__close-icon" :data-test-id="'ratings-drawer-settings-add-user-consent-delete-link-' + idx"></i></div>
            </div>
            <el-button v-if="newLinkAllowed" @click="add" type="text" data-test-id="ratings-drawer-settings-add-user-consent-add-link-button">{{i18n('rating.drawer.consent.add.link')}}</el-button>
        </div>
    </div>
</template>

<script>
import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';

export default {
    components: {
        ClyTooltipIcon
    },
    mixins: [countlyVue.mixins.i18n],
    props: {
        value: {
            type: Object,
            default: false
        },
        maxLinks: {
            type: Number,
            default: 3
        },
        readOnly: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        setFocusedChild: function(childId) {
            this.$emit("update:focusedItemIdentifier", childId);
        },
        removeLinkAtIndex: function(index) {
            this.$delete(this.links, index);
        },
        onDelete: function(id) {
            if (this.value.link.length > 1 && this.value.link.length <= this.maxLinks) {
                this.value.link.splice(id, 1);
            }
        },
        add: function() {
            this.value.link.push({
                "text": "Another Link",
                "link": "https://otherlink.com",
                "textValue": "Another Link",
                "linkValue": "https://otherlink.com"
            });
        }
    },
    computed: {
        newLinkAllowed: function() {
            return !this.readOnly && this.value.link.length < this.maxLinks;
        }
    }
};
</script>
