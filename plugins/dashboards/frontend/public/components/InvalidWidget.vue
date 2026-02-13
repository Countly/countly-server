<template>
    <div v-bind:class="[componentId, 'clyd-widget', 'cly-vue-dashboards__null-widgets']">
        <div class="bu-level">
            <div class="bu-level-left"></div>
            <div class="bu-level-right">
                <slot name="action"></slot>
            </div>
        </div>
        <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center bu-is-justify-content-center" style="height: calc(100% - 32px); opacity: 0.6">
            <h4 class="color-cool-gray-100">{{ i18nM('common.emtpy-view-title') }}</h4>
            <p class="bu-mt-1 text-small color-cool-gray-50 bu-has-text-centered">{{i18nM('dashboards.plugin-invalid-data', widget.feature || widget.widget_type)}}</p>
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        widget: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
};
</script>
