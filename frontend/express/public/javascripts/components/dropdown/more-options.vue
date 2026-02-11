<template>
    <cly-dropdown
        :pop-class="popClass"
        class="cly-vue-more-options"
        ref="dropdown"
        :widthSameAsTrigger="widthSameAsTrigger"
        :placement="placement"
        :disabled="disabled"
        @hide="toggleArrowState"
        @show="toggleArrowState"
        v-on="$listeners"
    >
        <template v-slot:trigger>
            <slot name="trigger">
                <el-button
                    :data-test-id="testId + '-more-option-button'"
                    :size="size"
                    :icon="icon"
                    :type="type"
                    :disabled="disabledButton"
                >
                    <span :data-test-id="testId + '-more-option-text'" v-if="text">{{ text }}</span>
                    <i
                        v-if="showArrows"
                        style="display:inline-block; margin: 0px 0px 0px 8px;"
                        :class="iconClass"
                    ></i>
                </el-button>
            </slot>
        </template>
        <template v-slot>
            <slot>
            </slot>
        </template>
    </cly-dropdown>
</template>

<script>
import { goTo } from '../../countly/countly.helpers';
import Emitter from 'element-ui/src/mixins/emitter';

export default {
    componentName: 'ElDropdown',
    mixins: [Emitter],
    props: {
        size: {
            type: String,
            default: 'small'
        },
        icon: {
            type: String,
            default: 'el-icon-more'
        },
        text: {
            type: String,
            default: null
        },
        type: {
            type: String,
            default: 'default'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        disabledButton: {
            type: Boolean,
            default: false,
        },
        placement: {
            type: String,
            default: 'bottom-end'
        },
        popClass: {
            type: String,
            default: ''
        },
        testId: {
            type: String,
            default: 'cly-more-options-test-id'
        },
        showArrows: {
            type: Boolean,
            default: false
        },
        widthSameAsTrigger: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            arrowState: false,
            iconClass: 'el-collapse-item__arrow ion-arrow-down-b'
        };
    },
    mounted: function() {
        this.$on('menu-item-click', this.handleMenuItemClick);
    },
    methods: {
        handleMenuItemClick: function(command, instance) {
            if (!this.disabled) {
                if (command && command.url) {
                    goTo({url: command.url, download: !!command.download, isExternalLink: !!command.isExternalLink});
                }
                else {
                    this.$emit('command', command, instance);
                }
                this.$refs?.dropdown?.handleClose();
            }
        },
        toggleArrowState: function() {
            this.arrowState = !this.$refs.dropdown.visible;
            if (this.arrowState) {
                this.iconClass = 'el-collapse-item__arrow ion-arrow-down-b';
            }
            else {
                this.iconClass = 'el-collapse-item__arrow ion-arrow-down-b is-active';
            }
        }
    },
    beforeDestroy: function() {
        this.$off();
    }
};
</script>
