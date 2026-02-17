<template>
    <cly-dialog
        ref="dialog"
        class="cly-vue-remote-config-conditions-drawer-json-editor"
        :close-on-press-escape="false"
        :close-on-click-modal="false"
        :visible.sync="isOpen"
        :show-close="false"
        width="500px"
        :modal="false"
        center
    >
        <cly-json-editor
            v-on:closed="handleClose"
            :emitClose="true"
            :isOpened="isOpen"
            ref="jsonEditor"
            v-model="currentVal"
        />
    </cly-dialog>
</template>
<script>
export default {
    data: function() {
        return {
            currentVal: ""
        };
    },
    props: {
        value: String,
        isOpen: Boolean
    },
    watch: {
        value: {
            immediate: true,
            handler: function(newValue) {
                this.currentVal = newValue;
            }
        },
    },
    methods: {
        handleClose: function() {
            this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", false);
            this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditorForCondition", false);
            this.$emit("input", this.currentVal);
        }
    }
};
</script>
