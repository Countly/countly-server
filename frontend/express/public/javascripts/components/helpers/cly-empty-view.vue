<template>
    <div :class="classes">
        <slot name="icon">
            <div v-if="visual!=='framed'" class="bu-mt-6">
                <img :data-test-id="testId + '-empty-view-icon'" class="cly-vue-empty-view__img" src="/images/icons/empty-plugin.svg"/>
            </div>
        </slot>
        <div class="bu-mt-2 bu-is-flex bu-is-flex-direction-column">
            <slot name="title">
                <h3 v-if="visual=='framed'" :data-test-id="testId + '-empty-view-title'" class="bu-ml-5 color-cool-gray-100 bu-mt-4">{{displayTitle}}</h3>
                <h3 v-else :data-test-id="testId + '-empty-view-title'" class="bu-has-text-centered color-cool-gray-100 bu-mt-4">{{displayTitle}}</h3>
            </slot>
            <slot name="subTitle">
                <div v-if="visual=='framed'" class="bu-mt-3 bu-mb-5 bu-ml-5 text-medium color-cool-gray-50 cly-vue-empty-view__subtitle"><span :data-test-id="testId + '-empty-view-subtitle'" v-html="displaySubTitle"></span></div>
                <div v-else class="bu-mt-4 bu-mb-5 text-medium color-cool-gray-50 bu-has-text-centered cly-vue-empty-view__subtitle"><span :data-test-id="testId + '-empty-view-subtitle'" v-html="displaySubTitle"></span></div>
            </slot>
            <slot name="action" v-if="hasCreateRight && hasAction">
                <div v-if="visual=='framed'" style="width: 200px" class="bu-ml-5 bu-pb-4"><el-button :data-test-id="testId + '-empty-view-action-button'" @click="actionFunc"><i class="cly-countly-icon-outline cly-countly-icon-outline-plus-circle-16px bu-pr-4 bu-mr-1"></i> {{actionTitle}}</el-button></div>
                <div v-else :data-test-id="testId + '-empty-view-action-button'" @click="actionFunc" class="bu-is-clickable button bu-has-text-centered color-blue-100 pointer">{{actionTitle}}</div>
            </slot>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        title: { default: '', type: String },
        subTitle: { default: '', type: String },
        actionTitle: { default: "Create", type: String },
        actionFunc: { default: null, type: Function },
        hasAction: { default: false, type: Boolean },
        hasCreateRight: { default: true, type: Boolean },
        testId: { type: String, default: "cly-empty-view" },
        visual: { type: String, default: "old" }
    },
    computed: {
        displayTitle: function() {
            return this.title || this.$i18n('common.emtpy-view-title');
        },
        displaySubTitle: function() {
            return this.subTitle || this.$i18n('common.emtpy-view-subtitle');
        }
    },
    data: function() {
        var settings = {
            classes: 'bu-mt-5 bu-pt-4 bu-is-flex bu-is-flex-direction-column bu-is-align-items-center cly-vue-empty-view',
            align: 'center'
        };
        if (this.visual === "framed") {
            settings.classes = 'bu-pb-5 bu-pt-4 bu-pl-3 bu-is-flex bu-is-flex-direction-column bu-is-align-items-left cly-vue-empty-view cly-vue-empty-view-framed';
            settings.align = 'left';
        }

        return settings;
    }
};
</script>
