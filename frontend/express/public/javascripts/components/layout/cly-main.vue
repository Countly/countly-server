<template>
    <div class="cly-vue-main bu-columns bu-is-gapless bu-is-centered">
        <div class="bu-column bu-is-full" style="max-width: 1920px">
            <PersistentNotifications></PersistentNotifications>
            <slot></slot>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';
import { getGlobalStore } from '../../countly/vue/core.js';

const PersistentNotifications = {
    template: `<div class="persistent-notifications" :class="additionalClasses">
        <cly-notification v-for="notification in persistentNotifications" :key="notification.id" :closable="false" :text="notification.text" :goTo="notification.goTo" :color="notification.color"></cly-notification>
    </div>`,
    computed: {
        persistentNotifications: function() {
            return this.$store.state.countlyCommon.persistentNotifications;
        },
        additionalClasses: function() {
            var classes = {};
            if (this.persistentNotifications.length > 0) {
                classes["bu-mb-5"] = true;
            }

            return classes;
        }
    },
    store: getGlobalStore(),
};

export default {
    mixins: [BaseComponentMixin],
    components: {
        PersistentNotifications: PersistentNotifications
    }
};
</script>
