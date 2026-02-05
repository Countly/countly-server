<template>
    <div class="notification-toasts">
        <cly-notification
            v-for="toast in notificationToasts"
            :key="toast.id"
            :id="toast.id"
            :text="toast.text"
            :goTo="toast.goTo"
            :autoHide="toast.autoHide"
            :color="toast.color"
            :closable="true"
            :customWidth="toast.width"
            :toast="true"
            class="notification-toasts__item"
            @close="onClose"
        />
    </div>
</template>

<script>
export default {
    name: 'ClyNotificationToasts',
    computed: {
        notificationToasts: function() {
            return this.$store.state.countlyCommon.notificationToasts;
        }
    },
    methods: {
        onClose: function(id) {
            this.$store.dispatch('countlyCommon/onRemoveNotificationToast', id);
        }
    }
};
</script>