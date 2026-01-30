<template>
    <div class="cly-vue-content-builder__layout-main__body" :class="{ 'bu-is-justify-content-flex-end': hideLeftSidebar, 'bu-is-justify-content-flex-start': hideRightSidebar, 'cly-vue-content-builder__layout-main__body__dashed-bg': hasDashedBackground }" :style="{'background-color': backgroundColor}">
        <transition :name="toggleTransition" @enter="onViewEntered">
            <div v-if="!hideLeftSidebar && (collapsible && !isCollapsed)" class="cly-vue-content-builder__layout-main__body__left-sidebar" :style="{ 'width': this.leftSidebarWidth + 'px !important'}">
                <div class="cly-vue-content-builder__layout-main__body__left-sidebar__header">
                    <div class="cly-vue-content-builder__layout-main__body__left-sidebar__header__title">
                        <h4>Screens</h4>
                        <cly-tooltip-icon class="bu-ml-1" :tooltip="toolTipLeft"></cly-tooltip-icon>
                    </div>
                    <div v-if="collapsible" class="cly-vue-content-builder__layout-main__body__collapse-button" @click="collapseBar('left')">
                        <div class="cly-vue-content-builder__layout-main__body__collapse-button__icon color-warm-gray-80">
                            <i class="cly-io cly-io-arrow-sm-left"></i>
                        </div>
                    </div>
                </div>
                <div class="cly-vue-content-builder__layout-main__body__left-sidebar__body">
                    <slot name="content-layout-left-sidebar"></slot>
                </div>
            </div>
            <div v-else-if="!hideLeftSidebar && collapsible" class="cly-vue-content-builder__layout-main__body__collapse-button" @click="collapseBar('left')">
                <div class="cly-vue-content-builder__layout-main__body__collapse-button__icon color-warm-gray-80">
                    <i class="cly-io cly-io-arrow-sm-left"></i>
                </div>
            </div>
            <div  v-else-if="!hideLeftSidebar" class="cly-vue-content-builder__layout-main__body__left-sidebar" :style="{ 'width': this.leftSidebarWidth + 'px !important'}">
                <template v-if="$slots['content-layout-left-sidebar-wrapper']">
                    <vue-scroll :ops="scrollOps">
                        <slot name="content-layout-left-sidebar-wrapper"></slot>
                    </vue-scroll>
                </template>
            </div>
        </transition>
        <slot name="content-layout-body">
        </slot>
        <div v-if="!hideRightSidebar" class="cly-vue-content-builder__layout-main__body__right-sidebar" :style="{ 'width': this.rightSidebarWidth + 'px !important'}">
            <vue-scroll :ops="scrollOps">
                <slot name="content-layout-right-sidebar"></slot>
            </vue-scroll>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        hideLeftSidebar: {
            type: Boolean,
            required: false,
            default: false
        },
        hideRightSidebar: {
            type: Boolean,
            required: false,
            default: false
        },
        collapsible: {
            type: Boolean,
            required: false,
            default: true
        },
        rightSidebarWidth: {
            type: String,
            required: false,
            default: null
        },
        leftSidebarWidth: {
            type: String,
            required: false,
            default: null
        },
        hasDashedBackground: {
            type: Boolean,
            required: false,
            default: false
        },
        backgroundColor: {
            type: String,
            required: false,
            default: '#fff'
        },
        toolTipLeft: {
            type: String,
            required: false,
            default: 'Screens'
        }
    },
    data: function() {
        return {
            toggleTransition: 'stdt-slide-left',
            isCollapsed: false,
            scrollOps: {
                vuescroll: {},
                scrollPanel: {
                    initialScrollX: false
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: false
                }
            },
        };
    },
    methods: {
        collapseBar: function(position) {
            if (position === 'left') {
                this.isCollapsed = !this.isCollapsed;
            }
        },
        onViewEntered: function() {
            if (this.$refs.rootEl) {
                this.$refs.rootEl.focus();
            }
        }
    }
};
</script>
