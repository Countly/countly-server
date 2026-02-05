<template>
    <div>
        <cly-confirm-dialog
            v-for="dialog in confirmDialogs"
            :key="dialog.id"
            :dialogType="dialog.type"
            :test-id="dialog.testId"
            :saveButtonLabel="dialog.confirmLabel"
            :cancelButtonLabel="dialog.cancelLabel"
            :title="dialog.title"
            :show-close="dialog.showClose"
            :alignCenter="dialog.alignCenter"
            visible
            @confirm="onCloseDialog(dialog, true)"
            @cancel="onCloseDialog(dialog, false)"
            @close="onCloseDialog(dialog, false)"
        >
            <template slot-scope="scope">
                <div v-html="dialog.message"></div>
            </template>
        </cly-confirm-dialog>

        <cly-message-dialog
            v-for="dialog in messageDialogs"
            :key="dialog.id"
            :test-id="dialog.testId"
            :dialogType="dialog.type"
            :confirmButtonLabel="dialog.confirmLabel"
            :title="dialog.title"
            :show-close="false"
            visible
            @confirm="onCloseDialog(dialog, true)"
            @close="onCloseDialog(dialog, false)"
        >
            <template slot-scope="scope">
                <div v-html="dialog.message"></div>
            </template>
        </cly-message-dialog>

        <el-dialog
            v-for="dialog in blockerDialogs"
            :key="dialog.id"
            :test-id="dialog.testId"
            :center="dialog.center"
            :width="dialog.width"
            :title="dialog.title"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
            visible
        >
            <div v-html="dialog.message"></div>
        </el-dialog>
    </div>
</template>

<script>
export default {
    name: 'ClyDialogs',
    computed: {
        messageDialogs: function() {
            return this.$store.getters['countlyCommon/messageDialogs'];
        },
        confirmDialogs: function() {
            return this.$store.getters['countlyCommon/confirmDialogs'];
        },
        blockerDialogs: function() {
            return this.$store.getters['countlyCommon/blockerDialogs'];
        }
    },
    methods: {
        onCloseDialog: function(dialog, status) {
            if (dialog.callback) {
                dialog.callback(status);
            }
            this.$store.dispatch('countlyCommon/onRemoveDialog', dialog.id);
        }
    }
};
</script>