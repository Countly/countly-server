<template>
    <div class="cly-vue-section" :class="topClasses">
        <div :class="[levelClass]">
            <div class="bu-level-left">
                <slot name="header">
                    <div class="bu-level-item" v-if="title">
                        <h4 class="bu-mr-1">{{title}}</h4>
                        <cly-tooltip-icon v-if="tooltip" :tooltip="tooltip"></cly-tooltip-icon>
                    </div>
                </slot>
            </div>
        </div>
        <div class="cly-vue-section__content white-bg">
            <div v-if="!hideConfig" class="cly-vue-section__content-config bu-is-flex bu-px-4 bu-py-2">
                <slot name="config"></slot>
            </div>
            <slot></slot>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        title: String,
        autoGap: {
            type: Boolean,
            default: false
        },
        hideConfig: {
            type: Boolean,
            default: true
        },
        skin: {
            type: String,
            default: "default",
            required: false,
            validator: function(val) {
                return val === "default" || val === "configurator";
            }
        },
        tooltip: {
            type: String,
            default: ""
        },
    },
    data: function() {
        return {
            isMounted: false
        };
    },
    mounted: function() {
        this.isMounted = true;
    },
    computed: {
        levelClass: function() {
            return {
                "bu-mb-4": this.$scopedSlots.header || this.$slots.header || (this.title && this.title.length),
                "bu-level": true
            };
        },
        topClasses: function() {
            var classes = {};
            classes["cly-vue-section--has-" + this.skin + "-skin"] = true;
            return classes;
        }
    }
};
</script>
