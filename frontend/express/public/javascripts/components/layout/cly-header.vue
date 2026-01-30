<template>
    <div>
        <div :class="[headerClasses]">
            <div class="bu-level bu-is-mobile" v-if="slotHeaderTop">
                <div class="bu-level-left">
                    <slot name="header-top"></slot>
                </div>
            </div>
            <template v-if="backlink && backlink.url && backlink.title">
                <div class="bu-level bu-is-mobile">
                    <div class="bu-level-left">
                        <cly-back-link :title="backlink.title" :link="backlink.url"></cly-back-link>
                    </div>
                </div>
            </template>
            <div :class="[midLevelClasses]">
                <div class="bu-level-left bu-is-flex-shrink-1" :data-test-id="testId" style="min-width: 0;">
                    <template>
                        <slot name="header-left">
                            <div class="bu-level-item">
                                <h2 class="bu-mr-2">{{title}}</h2>
                                <cly-guide v-if="title" :test-id="testId" :tooltip="tooltip"></cly-guide>
                            </div>
                        </slot>
                    </template>
                </div>
                <div class="bu-level-right">
                    <slot name="header-right"></slot>
                </div>
            </div>
            <div class="bu-level bu-is-mobile" v-if="slotHeaderBottom">
                <div class="bu-level-left">
                    <slot name="header-bottom"></slot>
                </div>
            </div>
        </div>
        <slot name="header-tabs"></slot>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        title: String,
        backlink: {
            type: Object,
            default: function() {
                return null;
            },
        },
        testId: {
            type: String,
            default: "header-title"
        },
        headerClass: {
            type: Object,
            default: function() {
                return {};
            }
        },
        tooltip: Object
    },
    computed: {
        slotHeaderTop: function() {
            return !!(this.$scopedSlots["header-top"] || this.$slots["header-top"]);
        },
        slotHeaderBottom: function() {
            return !!(this.$scopedSlots["header-bottom"] || this.$slots["header-bottom"]);
        },
        slotHeaderTabs: function() {
            return !!(this.$scopedSlots["header-tabs"] || this.$slots["header-tabs"]);
        },
        headerClasses: function() {
            var cls = {
                "cly-vue-header": true,
                "white-bg": true,
                "cly-vue-header--no-mb": this.slotHeaderTabs,
                "cly-vue-header--no-bb": this.slotHeaderTabs
            };

            return Object.assign(cls, this.headerClass);
        },
        midLevelClasses: function() {
            return {
                "bu-level": true,
                "bu-is-mobile": true,
                "cly-vue-header__level": true,
                "cly-vue-header__level--no-pt": !this.slotHeaderTop,
                "cly-vue-header__level--no-pb": !this.slotHeaderBottom
            };
        }
    }
};
</script>
