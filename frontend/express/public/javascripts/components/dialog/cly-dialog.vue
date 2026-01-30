<template>
    <el-dialog :destroy-on-close="true" class="cly-vue-dialog" :class="topClasses" v-on="$listeners" v-bind="$attrs" :title="title" :append-to-body="true">
        <template v-slot:title><h3 :data-test-id="testId + '-cly-dialog-title-label'" class="color-cool-gray-100">{{title}}</h3></template>
        <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">
            <slot :name="name"/>
        </template>
    </el-dialog>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        title: {
            type: String,
            required: false,
            default: ''
        },
        autoCentered: {
            type: Boolean,
            required: false,
            default: false
        },
        testId: {
            type: String,
            default: 'cly-vue-dialog-test-id',
            required: false,
        }
    },
    computed: {
        forwardedSlots: function() {
            var self = this;
            return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                slots[slotKey] = self.$scopedSlots[slotKey];
                return slots;
            }, {});
        },
        topClasses: function() {
            if (this.autoCentered) {
                return "is-auto-centered";
            }
        }
    }
};
</script>
