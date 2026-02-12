<template>
    <div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">
        <validation-observer ref="observer" v-slot="v">
            <div v-show="isActive" v-if="isParentReady">
                <slot />
            </div>
        </validation-observer>
    </div>
</template>

<script>
import { ValidationObserver } from 'vee-validate';
import { BaseStepMixin } from './mixins.js';

export default {
    components: {
        ValidationObserver
    },
    mixins: [BaseStepMixin],
    props: {
        validatorFn: { type: Function },
        id: { type: String, required: true },
        screen: {
            type: String,
            default: "half",
            validator: function(value) {
                return ['half', 'full'].indexOf(value) !== -1;
            }
        }
    },
    data: function() {
        return {
            watchHandle: null
        };
    },
    computed: {
        isParentReady: function() {
            if (this.$parent.isToggleable) {
                return this.$parent.isOpened;
            }
            return true;
        }
    },
    mounted: function() {
        var self = this;
        this.watchHandle = this.$watch(function() {
            return self.$refs.observer.flags.valid;
        },
        function(newVal) {
            self.isValid = newVal;
        });
    },
    beforeDestroy: function() {
        if (this.watchHandle) {
            this.watchHandle();
        }
    },
    methods: {
        reset: function() {
            this.$refs.observer.reset();
        },
        touch: function() {
            this.$refs.observer.validate();
        }
    }
};
</script>
