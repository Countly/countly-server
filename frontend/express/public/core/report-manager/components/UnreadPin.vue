<template>
    <div v-if="isActive" class="cly-bullet cly-bullet--orange bu-mr-1"></div>
</template>

<script>
export default {
    props: {
        appId: {
            type: String
        },
        taskId: {
            type: String,
            default: null
        },
        autoRead: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        isActive: function() {
            var unread = this.$store.state.countlyTaskManager.unread;
            return !!(unread && unread[this.appId] && unread[this.appId][this.taskId]);
        }
    },
    data: function() {
        return {
            isMounted: false
        };
    },
    mounted: function() {
        this.isMounted = true;
    },
    methods: {
        checkAutoRead: function() {
            if (this.autoRead && this.isMounted && this.isActive) {
                var store = this.$store,
                    taskId = this.taskId,
                    appId = this.appId;

                setTimeout(function() {
                    store.commit("countlyTaskManager/setRead", {
                        taskId: taskId,
                        appId: appId
                    });
                }, 3000);
            }
        }
    },
    watch: {
        isActive: function() {
            this.checkAutoRead();
        },
        isMounted: function() {
            this.checkAutoRead();
        }
    }
};
</script>
