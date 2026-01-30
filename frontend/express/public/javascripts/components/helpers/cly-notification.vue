<template>
    <div v-if="isModalVisible" class="cly-vue-notification__alert-box" :class="dynamicClasses">
        <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center">
            <div class="bu-is-flex" style="width:100%">
                <img class="alert-image bu-p-2" data-test-id="cly-notification-img" :src="image">
                <div :style="dynamicStyle">
                    <slot>
                        <span class="alert-text" data-test-id="cly-notification-text" style="margin-block:auto" v-html="innerText">
                            {{ text }}
                        </span>
                    </slot>
                    <span v-if="goTo.title" class="bu-is-flex cursor-pointer">
                        <a class="bu-level-item bu-has-text-link bu-has-text-weight-medium" @click="goToUrl">
                            {{ goTo.title }}
                        </a>
                    </span>
                </div>
            </div>
            <div v-if="closable">
                <div :class="closeIconDynamicClasses" @click="closeModal">
                    <slot name="close">
                        <i :data-test-id="closeIconDataId" class="cly-vue-notification__alert-box__close-icon el-icon-close bu-mr-2" />
                    </slot>
                </div>
            </div>
            <div v-else class="bu-ml-5" />
        </div>
    </div>
</template>

<script>
import * as CountlyHelpers from '../../countly/countly.helpers.js';

export default {
    props: {
        id: { default: "", type: [String, Number], required: false },
        text: { default: "" },
        color: { default: "light-warning", type: String },
        size: { default: "full", type: String },
        visible: { default: true, type: Boolean },
        closable: { default: true, type: Boolean },
        autoHide: { default: false, type: Boolean },
        goTo: {
            default() {
                return { title: '', url: '', from: '' };
            },
            type: Object
        },
        customWidth: { default: "", type: String },
        toast: { default: false, type: Boolean }
    },
    data: function() {
        return {
            autoHideTimeout: null,
            DEFAULT_STAY_TIME_IN_MS: 7000,
            isModalVisible: true
        };
    },
    watch: {
        visible: {
            immediate: true,
            handler: function(newVisible) {
                this.isModalVisible = newVisible;
            }
        },
        isModalVisible: function(newVisible) {
            this.$emit("update:visible", newVisible);
        }
    },
    computed: {
        closeIconDynamicClasses: function() {
            if (this.size === 'full') {
                return 'bu-ml-2';
            }
            return 'bu-ml-3 bu-pl-3 bu-ml-3';
        },
        closeIconDataId: function() {
            if (this.size === 'full') {
                return 'cly-notification-full-size-close-icon';
            }
            return 'cly-notification-modal-close-icon';
        },
        dynamicClasses: function() {
            var classes = ["cly-vue-notification__alert-box__alert-text--" + this.color, "cly-vue-notification__alert-box--" + this.size];
            if (this.customWidth !== "") {
                classes.push(`notification-toasts__item--${this.customWidth}`);
            }
            return classes;
        },
        image: function() {
            if (this.color === "dark-informational" || this.color === "light-informational") {
                return "images/icons/notification-toast-informational.svg";
            }
            else if (this.color === "light-successful" || this.color === "dark-successful") {
                return "images/icons/notification-toast-successful.svg";
            }
            else if (this.color === "light-destructive" || this.color === "dark-destructive") {
                return "images/icons/notification-toast-destructive.svg";
            }
            else if (this.color === "light-warning" || this.color === "dark-warning") {
                return "images/icons/notification-toast-warning.svg";
            }
        },
        innerText: function() {
            if (this.text) {
                return this.text;
            }
            return "";
        },
        dynamicStyle: function() {
            let style = {
                "display": "flex",
                "flex-direction": this.toast ? "column" : "row",
                "width": "100%"
            };
            if (this.toast) {
                style.gap = "5px";
            }
            else {
                style["justify-content"] = "space-between";
            }
            return style;
        }
    },
    methods: {
        closeModal: function() {
            this.isModalVisible = false;
            this.$emit('close', this.id);
        },
        goToUrl: function() {
            CountlyHelpers.goTo(this.goTo);
        }
    },
    mounted: function() {
        if (this.autoHide) {
            this.autoHideTimeout = setTimeout(this.closeModal, this.DEFAULT_STAY_TIME_IN_MS);
        }
    },
    beforeDestroy: function() {
        if (this.autoHide && this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }
    }
};
</script>
