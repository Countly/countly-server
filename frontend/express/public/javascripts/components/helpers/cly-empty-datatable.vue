<template>
    <div :style="topStyle" :class="['bu-is-flex bu-is-flex-direction-column bu-is-align-items-center bu-is-justify-content-center', classes]" style="height: 100%;opacity: 0.6">
        <slot name="icon">
            <div>
                <img :data-test-id="testId + '-empty-logo'" :src="image"/>
            </div>
        </slot>
        <div class="bu-mt-2">
            <slot name="title">
                <h4 :data-test-id="testId + '-empty-title'" class="color-cool-gray-100 bu-has-text-centered">{{displayTitle}}</h4>
            </slot>
            <slot name="subTitle">
                <div :data-test-id="testId + '-empty-subtitle'" class="bu-mt-1 text-small color-cool-gray-50 bu-has-text-centered">{{displaySubTitle}}</div>
            </slot>
        </div>
    </div>
</template>

<script>
export default {
    inheritAttrs: false,
    props: {
        image: { default: 'images/icons/empty-view-icon.svg', type: String },
        title: { default: '', type: String },
        subTitle: { default: '', type: String },
        height: { default: 0, type: Number },
        classes: {
            type: Object,
            default: function() {
                return {
                    'bu-py-6': true
                };
            }
        },
        testId: { type: String, default: "cly-empty-view" }
    },
    computed: {
        topStyle: function() {
            if (this.height) {
                return { height: this.height + "px" };
            }
        },
        displayTitle: function() {
            return this.title || this.$i18n('common.emtpy-view-title');
        },
        displaySubTitle: function() {
            return this.subTitle || this.$i18n('common.emtpy-view-subtitle');
        }
    }
};
</script>
