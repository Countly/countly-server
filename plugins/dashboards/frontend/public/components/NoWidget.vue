<template>
<div v-bind:class="[componentId]">
    <cly-blank>
        <template v-slot:icon>
            <img :src="'dashboards/images/no-widget.svg'" data-test-id="no-widget-icon">
        </template>
        <template v-slot:title>
            <h3 class="bu-mt-4" data-test-id="empty-view-title">{{ i18n('common.emtpy-view-title') }}</h3>
        </template>
        <template v-slot:subTitle v-if="canUpdate">
            <p class="text-medium color-cool-gray-50 bu-m-0 bu-mt-4 bu-has-text-centered" data-test-id="empty-view-subtitle">
                {{ i18n('common.no-widget-text')}}
            </p>
            <div class="bu-has-text-centered bu-mt-5">
                <el-button type="text" size="small" @click="newWidget">
                    <span class="bu-has-text-weight-medium" data-test-id="add-widget-button">{{ i18n('common.add-widget') }}</span>
                </el-button>
            </div>
        </template>
    </cly-blank>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyBlank from '../../../../../frontend/express/public/javascripts/components/helpers/cly-blank.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyBlank
    },
    props: {
        canUpdate: {
            type: Boolean,
            default: true
        }
    },
    methods: {
        newWidget: function() {
            this.$emit("new-widget");
        }
    }
};
</script>
