<template>
    <span v-tooltip.bottom.center="description" class="cly-vue-push-notification-mobile-preview__user-property">{{fallback}}</span>
</template>

<script>
import { i18n } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    props: {
        value: {
            type: Object,
            required: true,
        },
    },
    computed: {
        userProperty: function() {
            return this.value.userProperty;
        },
        fallback: function() {
            return this.value.fallback;
        },
        description: function() {
            return i18n('push-notification-fallback-value-description', this.userProperty, this.fallback);
        }
    }
};
</script>
