<template>
    <div
        class="cly-vue-dropdown el-select"
        v-click-outside="handleOutsideClick"
        :data-test-id="testId + '-dropdown-el-select'"
    >
        <trigger-proxy
            ref="reference"
            @click.native.stop="handleToggle"
            @keydown.native.esc.stop.prevent="handleClose(true)"
            @keydown.native.down.enter.prevent="handleOpen"
            @keydown.native.down.stop.prevent="handleOpen"
            @keydown.native.up.stop.prevent="handleOpen"
        >
            <slot name="trigger" :visible="visible" :focused="focused">
            </slot>
        </trigger-proxy>
        <el-select-dropdown
            :id="id"
            ref="popper"
            :width="computedWidth"
            :append-to-body="popperAppendToBody"
            :placement="placement"
            :visible-arrow="false"
            v-model="visible"
            v-show="visible"
        >
            <div ref="popContent" class="cly-vue-dropdown__pop-container">
                <slot>
                </slot>
            </div>
        </el-select-dropdown>
    </div>
</template>

<script>
import Emitter from 'element-ui/src/mixins/emitter';

const TriggerProxy = {
    template: '<div style="width:100%"><slot v-slot></slot></div>'
};

export default {
    mixins: [Emitter],
    components: {
        'trigger-proxy': TriggerProxy,
        'el-select-dropdown': window.ELEMENT.SelectDropdown
    },
    props: {
        disabled: {
            type: Boolean,
            default: false
        },
        popperAppendToBody: {
            type: Boolean,
            default: true
        },
        width: {
            type: [Number, Object, String],
            default: null
        },
        placement: {
            type: String,
            default: 'bottom-start'
        },
        popClass: {
            type: String
        },
        id: {
            type: String
        },
        widthSameAsTrigger: {
            type: Boolean,
            default: false
        },
        testId: {
            type: String,
            default: "cly-dropdown-default-test-id",
            required: false
        }
    },
    inject: {
        popperAncestors: {
            default: function() {
                return {};
            }
        }
    },
    computed: {
        popperUid: function() {
            return "popper-" + this.componentId;
        },
        popperClass: function() {
            return "cly-vue-dropdown__pop" + (this.popClass ? " " + this.popClass : "");
        }
    },
    provide: function() {
        var history = Object.assign({}, this.popperAncestors);
        history[this.popperUid] = true;
        return {
            'popperAncestors': history
        };
    },
    data: function() {
        return {
            visible: false,
            focused: false,
            computedWidth: ""
        };
    },
    beforeDestroy: function() {
        this.broadcast('ElSelectDropdown', 'destroyPopper');
        this.$refs.popper && this.$refs.popper.doDestroy();
    },
    methods: {
        doClose: function(aborted) {
            if (this.visible) {
                this.visible = false;
                this.$emit("hide", aborted);
            }
        },
        handleOutsideClick: function() {
            this.doClose(true);
            this.focused = false;
        },
        handleClose: function(aborted) {
            this.doClose(aborted);
        },
        handleOpen: function() {
            if (!this.disabled && !this.visible) {
                this.visible = true;
            }
        },
        handleToggle: function() {
            if (this.disabled && !this.visible) {
                return;
            }
            this.visible = !this.visible;
            if (!this.visible) {
                this.$emit("hide", true);
            }
            else {
                if (this.width) {
                    this.computedWidth = this.width;
                }
                else {
                    if (this.widthSameAsTrigger) {
                        this.computedWidth = this.$refs.reference.$el.offsetWidth;
                    }
                    else {
                        this.computedWidth = this.width;
                    }
                }
            }
        },
        updateDropdown: function() {
            var self = this;
            this.$nextTick(function() {
                self.broadcast('ElSelectDropdown', 'updatePopper');
            });
        }
    },
    watch: {
        visible: function(newValue) {
            if (newValue) {
                this.$emit("show");
                this.focused = true;
            }
        }
    }
};
</script>
