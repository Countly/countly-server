<template>
    <div ref="addUserPropertyPopover">
        <form>
        <div v-if="isOpen" v-bind:style="getStyleObject" class="cly-vue-push-notification-add-user-property-popover">
            <div class="cly-vue-push-notification-add-user-property-popover__inner">
                <div class="cly-vue-push-notification-add-user-property-popover__title">{{i18n('push-notification.add-user-property')}}</div>
                <div class="bu-is-flex bu-is-align-items-center bu-mb-5">
                    <el-radio-group v-model="selectedPropertyCategory" size="small">
                        <el-radio-button v-for="item in propertyCategoryOptions" :label="item.value" :key="item.value">
                            {{item.label}}
                        </el-radio-button>
                    </el-radio-group>
                </div>
                <validation-observer ref="validationObserver">
                    <template v-if="selectedPropertyCategory === 'external'">
                        <div class="bu-level bu-is-flex-direction-column bu-is-align-items-flex-start bu-mb-4">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.api-property')}}</div>
                            <validation-provider vid="apiValueValidator" v-slot="validation" rules="required" style="width:100%">
                                <el-input :value="userProperty.value" @input="onInput" :placeholder="i18n('push-notification.enter-value')" :class="{'is-error': validation.errors.length > 0}" autocomplete="off"> </el-input>
                            </validation-provider>
                        </div>
                    </template>
                    <template v-else>
                        <div class="bu-level bu-is-flex-direction-column bu-is-align-items-flex-start bu-mb-4">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">Property</div>
                            <validation-provider vid="userPropertyValidator" v-slot="validation" rules="required">
                                <cly-select-x
                                    :search-placeholder="i18n('push-notification.search-in-properties')"
                                    :placeholder="i18n('push-notification.select-property')"
                                    :value="userProperty.value"
                                    :width="320"
                                    @change="onSelect"
                                    mode="single-list"
                                    :hide-all-options-tab="false"
                                    :options="options"
                                    :class="[validation.errors.length > 0 ? 'is-error': null,'cly-vue-push-notification-add-user-property-popover__select-value']">
                                </cly-select-x>
                            </validation-provider>
                        </div>
                    </template>
                    <div>
                        <el-checkbox :value="userProperty.isUppercase" @change="onUppercase" class="bu-mb-4">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.start-with-capital-letter')}}</div>
                        </el-checkbox>
                    </div>
                    <div>
                        <div class="bu-level bu-is-flex-direction-column bu-is-align-items-flex-start">
                            <div class="bu-py-1 bu-my-1 cly-vue-push-notification-drawer__input-label">{{i18n('push-notification.fallback-value')}}</div>
                            <validation-provider vid="fallbackValueValidator" v-slot="validation" :rules="{push_notification_fallback:true}" style="width:100%">
                                <el-input v-tooltip="i18n('push-notification.fallback-value-desc')" :value="userProperty.fallback" @input="onFallback" placeholder="Enter fallback value" :class="{'is-error': validation.errors.length > 0}" autocomplete="off"> </el-input>
                            </validation-provider>
                        </div>
                    </div>
                </validation-observer>
                <div class="cly-vue-drawer-step__section cly-vue-drawer-step__line--aligned bu-is-justify-content-flex-end">
                    <el-button type="default" @click="onRemove">{{i18n('common.cancel')}}</el-button>
                    <el-button type="success" @click="onClose">{{i18n('push-notification.confirm')}}</el-button>
                </div>
            </div>
        </div>
        </form>
    </div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyPushNotification from '../../store/index.js';
import ClySelectX from '../../../../../../frontend/express/public/javascripts/components/input/select-x.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClySelectX,
    },
    props: {
        userProperty: {
            type: Object,
            default: function() {
                return {
                    id: "",
                    value: "",
                    fallback: "",
                    isUppercase: false,
                    type: countlyPushNotification.service.UserPropertyTypeEnum.USER
                };
            }
        },
        isOpen: {
            type: Boolean,
            default: false
        },
        container: {
            type: String,
            required: true
        },
        width: {
            type: Number,
            required: true,
            default: 350
        },
        position: {
            type: Object,
            required: true,
            default: function() {
                return {top: 0, left: 0, width: 0};
            }
        },
        options: {
            type: Array,
            required: true,
            default: function() {
                return [];
            }
        }
    },
    data: function() {
        return {
            selectedPropertyCategory: "internal",
            UserPropertyTypeEnum: countlyPushNotification.service.UserPropertyTypeEnum,
            propertyCategoryOptions: [
                {label: i18n('push-notification.internal-properties'), value: "internal"},
                {label: i18n('push-notification.external-properties'), value: "external"}
            ]
        };
    },
    computed: {
        getStyleObject: function() {
            var editorWith = this.$refs.addUserPropertyPopover.offsetWidth;
            var topOffset = 25;
            var result = {
                width: this.width + 'px',
                top: this.position.top + topOffset + 'px',
            };
            if (this.position.left + this.width > editorWith) {
                result.right = 0;
            }
            else {
                result.left = this.position.left + "px";
            }
            return result;
        },
    },
    watch: {
        userProperty: function(value) {
            if (value.type === this.UserPropertyTypeEnum.API) {
                this.selectedPropertyCategory = "external";
                return;
            }
            this.selectedPropertyCategory = "internal";
        }
    },
    methods: {
        findCategoryOptionByValue: function(value, categoryOptions) {
            return categoryOptions.find(function(item) {
                return item.value === value;
            });
        },
        findOptionByValue: function(value) {
            for (var index in this.options) {
                var item = this.findCategoryOptionByValue(value, this.options[index].options);
                if (item) {
                    return item;
                }
            }
            throw new Error('Unable to find user property option by value:' + value);
        },
        onSelect: function(value) {
            var optionItem = this.findOptionByValue(value);
            this.$emit('select', {id: this.userProperty.id, container: this.container, value: value, label: optionItem.label, type: optionItem.type});
        },
        onUppercase: function(value) {
            this.$emit('uppercase', {id: this.userProperty.id, container: this.container, value: value});
        },
        onFallback: function(value) {
            this.$emit('fallback', {id: this.userProperty.id, container: this.container, value: value});
        },
        onInput: function(value) {
            this.$emit('input', {id: this.userProperty.id, container: this.container, value: value});
        },
        onRemove: function() {
            this.$emit('remove', {id: this.userProperty.id, container: this.container});
        },
        onClose: function() {
            var self = this;
            this.$refs.validationObserver.validate().then(function(isValidated) {
                if (isValidated) {
                    self.$emit('close');
                }
            });
        },
    }
};
</script>
