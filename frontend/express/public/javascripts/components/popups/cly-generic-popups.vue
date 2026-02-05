<template>
    <div>
        <cly-notification-toasts />
        <cly-dialogs />
    </div>
</template>

<script>
import ClyNotificationToasts from './cly-notification-toasts.vue';
import ClyDialogs from './cly-dialogs.vue';

export default {
    name: 'ClyGenericPopups',
    components: {
        ClyNotificationToasts,
        ClyDialogs
    }
};
</script>