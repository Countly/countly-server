<template>
    <div :class="skinToApply" v-if="hasDiff" :style="leftPadding">
        <div v-if="isModal" class="cly-vue-diff-helper-modal bu-pl-2">
            <slot name="main">
                <div class="message">
                    <span class="text-dark">{{madeChanges}}</span>
                    <span class="text-dark">{{ $i18n("common.diff-helper.keep") }}</span>
                </div>
                <div class="buttons">
                    <el-button skin="light" class="discard-btn" @click="discard" type="secondary">{{$i18n('common.discard-changes')}}</el-button>
                    <el-button skin="green" class="save-btn" :disabled="disabled" @click="save" type="success">{{$i18n('common.save-changes')}}</el-button>
                </div>
            </slot>
        </div>
        <div v-else class="cly-vue-diff-helper bu-pl-2">
            <slot name="main">
                <div class="message">
                    <span class="text-dark">{{madeChanges}}</span>
                    <span class="text-dark">{{ $i18n("common.diff-helper.keep") }}</span>
                </div>
                <div class="buttons">
                    <el-button skin="light" class="discard-btn" @click="discard" type="secondary">{{$i18n('common.discard-changes')}}</el-button>
                    <el-button skin="green" class="save-btn" :disabled="disabled" @click="save" type="success">{{$i18n('common.save-changes')}}</el-button>
                </div>
            </slot>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        diff: {
            type: Array
        },
        disabled: {
            type: Boolean,
            required: false,
            default: false
        },
        emitSaveWhenDisabled: {
            type: Boolean,
            required: false,
            default: false
        },
        isModal: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    computed: {
        leftPadding: function() {
            if (this.hasDiff && this.isModal) {
                var dd = document.getElementById('cly-vue-sidebar').getBoundingClientRect();
                var value = dd.width || 272;
                return "left:" + value + 'px; width:calc(100% - ' + value + 'px)';
            }
            else {
                return "";
            }
        },
        hasDiff: function() {
            return this.diff.length > 0;
        },
        madeChanges: function() {
            return this.$i18n("common.diff-helper.changes", this.diff.length);
        },
        skinToApply: function() {
            return this.isModal ? 'cly-vue-diff-helper-modal-wrapper' : '';
        }
    },
    methods: {
        save: function() {
            if (this.disabled && !this.emitSaveWhenDisabled) {
                return;
            }
            this.$emit("save");
        },
        discard: function() {
            this.$emit("discard");
        }
    }
};
</script>
