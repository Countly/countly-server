<template>
    <div class="quickstart-popover-wrapper" data-test-id="quickstart-popover-wrapper">
        <div class="quickstart-popover-positioner" data-test-id="quickstart-popover-positioner">
            <el-popover
                v-for="content in quickstartContent"
                :key="content.id"
                :value="!!content"
                :visible-arrow="false"
                :width="content.width"
                :title="content.title"
                popper-class="quickstart-popover-popover"
                trigger="manual"
            >
                <i
                    class="ion-close bu-is-size-7 quickstart-popover-close"
                    data-test-id="quickstart-popover-close"
                    @click="handleCloseClick(content.id)"
                />
                <div v-html="content.message"></div>
            </el-popover>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ClyQuickstartPopover',
    computed: {
        quickstartContent: function() {
            return this.$store.getters['countlyCommon/quickstartContent'];
        }
    },
    methods: {
        handleCloseClick: function(dialogId) {
            this.$store.dispatch('countlyCommon/onRemoveDialog', dialogId);
        }
    }
};
</script>