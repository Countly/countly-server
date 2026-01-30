<template>
    <el-dialog destroyOnClose class="cly-vue-confirm-dialog" :custom-class="customClass" v-on="$listeners" v-bind="$attrs" :title="title">
        <template v-slot:title><h3 :data-test-id="testId + '-cly-confirm-dialog-title-label'" class="color-cool-gray-100" style="word-wrap: break-word">{{title}}</h3></template>
        <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">
            <slot :name="name"/>
        </template>
        <template v-slot:footer>
            <slot name="footer">
                <div class="cly-vue-formdialog__buttons is-single-step bu-is-justify-content-flex-end bu-is-flex">
                    <el-button size="small" :data-test-id="testId + '-cly-confirm-dialog-cancel-button'" @click="cancelClicked"  type="secondary" :disabled="cancelButtonDisabled" :style="buttonStyle(cancelButtonDisabled)" v-if="cancelButtonVisibility">{{cancelLabel}}</el-button>
                    <el-button size="small" :data-test-id="testId + '-cly-confirm-dialog-save-button'" @click="confirmClicked" type="success" :disabled="saveButtonDisabled" :style="buttonStyle(saveButtonDisabled)" v-if="confirmStyle=='success' && saveButtonVisibility" >{{saveLabel}}</el-button>
                    <el-button size="small" :data-test-id="testId + '-cly-confirm-dialog-warning-button'" @click="confirmClicked" type="warning" :disabled="saveButtonDisabled" :style="buttonStyle(saveButtonDisabled)" v-else-if="confirmStyle=='warning' && saveButtonVisibility" >{{saveLabel}}</el-button>
                    <el-button size="small" :data-test-id="testId + '-cly-confirm-dialog-danger-button'" @click="confirmClicked" type="danger" :disabled="saveButtonDisabled" :style="buttonStyle(saveButtonDisabled)" v-else-if="saveButtonVisibility" >{{saveLabel}}</el-button>
                </div>
            </slot>
        </template>
    </el-dialog>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        title: {type: String, required: true},
        saveButtonLabel: {type: String, required: false, default: 'Save'},
        saveButtonVisibility: {type: Boolean, required: false, default: true},
        saveButtonDisabled: {type: Boolean, required: false, default: false},
        cancelButtonLabel: {type: String, required: false, default: 'Cancel'},
        cancelButtonVisibility: {type: Boolean, required: false, default: true},
        cancelButtonDisabled: {type: Boolean, required: false, default: false},
        dialogType: {type: String, required: false, default: "success"},
        testId: {type: String, default: 'cly-vue-confirm-dialog-test-id', required: false},
        alignCenter: {type: Boolean, default: true}
    },
    computed: {
        forwardedSlots: function() {
            var self = this;
            return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                slots[slotKey] = self.$scopedSlots[slotKey];
                return slots;
            }, {});
        },
        saveLabel: function() {
            return this.$attrs.saveButtonLabel || this.saveButtonLabel;
        },
        cancelLabel: function() {
            return this.$attrs.cancelButtonLabel || this.cancelButtonLabel;
        },
        confirmStyle: function() {
            if (this.dialogType === "success" || this.dialogType === "danger" || this.dialogType === "warning") {
                return this.dialogType;
            }
            return "success";
        },
        customClass: function() {
            return this.alignCenter ? "el-dialog--centered" : "";
        },
    },
    methods: {
        buttonStyle: function(disabled) {
            return disabled ? { opacity: 0.5 } : {};
        },
        confirmClicked: function() {
            this.$emit("confirm");
        },
        cancelClicked: function() {
            this.$emit("cancel");
        }
    }
};
</script>
